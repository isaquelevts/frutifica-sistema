import { supabase } from '../../../core/supabase/supabaseClient';
import { Organization, PlanType } from '../../../shared/types/types';

export interface OrgWithStats {
  organization: Organization;
  cellCount: number;
  memberCount: number;
  reportCount: number;
  userCount: number;
  profiles: Array<{
    id: string;
    name: string;
    email: string;
    roles: string[];
    created_at: string;
    cell_id?: string;
  }>;
}

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalProfiles: number;
  totalCells: number;
  totalMembers: number;
  totalReports: number;
  organizations: Organization[];
}

export const superAdminService = {
  // ============================================================
  // ORGANIZAÇÕES
  // ============================================================

  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((o: any) => ({
      ...o,
      createdAt: o.created_at,
      plan: o.plan as PlanType,
      subscriptionStatus: o.subscription_status,
      subscriptionId: o.subscription_id,
      maxCells: o.max_cells,
    }));
  },

  async getOrganizationWithStats(orgId: string): Promise<OrgWithStats> {
    const [orgResult, cellsResult, membersResult, profilesResult, reportsResult] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase.from('cells').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('profiles').select('id, name, email, roles, created_at, cell_id').eq('organization_id', orgId),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    ]);

    if (orgResult.error) throw orgResult.error;

    const org = orgResult.data as any;
    return {
      organization: {
        ...org,
        createdAt: org.created_at,
        plan: org.plan as PlanType,
        subscriptionStatus: org.subscription_status,
        subscriptionId: org.subscription_id,
        maxCells: org.max_cells,
      },
      cellCount: cellsResult.count ?? 0,
      memberCount: membersResult.count ?? 0,
      userCount: profilesResult.data?.length ?? 0,
      reportCount: reportsResult.count ?? 0,
      profiles: (profilesResult.data ?? []) as OrgWithStats['profiles'],
    };
  },

  async getOrganizationCells(orgId: string) {
    const { data, error } = await supabase
      .from('cells')
      .select(`
        *,
        leader:profiles!cells_leader_id_fkey(name)
      `)
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getOrganizationGenerations(orgId: string) {
    const { data, error } = await supabase
      .from('generations')
      .select(`
        *,
        leader:profiles!generations_leader_id_fkey(name)
      `)
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getOrganizationReportsByWeek(orgId: string) {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const { data, error } = await supabase
      .from('reports')
      .select('id, date, participants, visitors, conversions')
      .eq('organization_id', orgId)
      .gte('date', twelveWeeksAgo.toISOString().split('T')[0])
      .order('date');
    if (error) throw error;
    return data ?? [];
  },

  async updateOrganizationName(orgId: string, name: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', orgId);
    if (error) throw error;
  },

  async updateOrganizationPlan(orgId: string, plan: PlanType, maxCells: number) {
    const { data, error } = await supabase
      .from('organizations')
      .update({ plan, max_cells: maxCells, subscription_status: 'active' })
      .eq('id', orgId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async suspendOrganization(orgId: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: 'suspended' })
      .eq('id', orgId);
    if (error) throw error;
  },

  async reactivateOrganization(orgId: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: 'active' })
      .eq('id', orgId);
    if (error) throw error;
  },

  async deleteOrganization(orgId: string) {
    // 1. Deletar auth.users via Edge Function (requer service_role internamente)
    const { error: edgeFnError } = await supabase.functions.invoke('delete-org-users', {
      body: { org_id: orgId },
    });
    if (edgeFnError) throw new Error(`Erro ao remover usuários: ${edgeFnError.message}`);

    // 2. Deletar dados da org em cascata via RPC (verifica is_superadmin() internamente)
    const { error } = await (supabase.rpc as any)('delete_organization_cascade', { org_id: orgId });
    if (error) throw error;
  },

  // ============================================================
  // SUPERADMINS
  // ============================================================

  async getSuperAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, roles, created_at')
      .contains('roles', ['superadmin']);
    if (error) throw error;
    return data ?? [];
  },

  async addSuperAdmin(email: string) {
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, roles')
      .eq('email', email)
      .single();

    if (findError || !profile) throw new Error('Usuário não encontrado com esse email');
    if (profile.roles?.includes('superadmin')) throw new Error('Usuário já é superadmin');

    const newRoles = [...(profile.roles ?? []), 'superadmin'];
    const { error } = await supabase
      .from('profiles')
      .update({ roles: newRoles })
      .eq('id', profile.id);
    if (error) throw error;
  },

  async removeSuperAdmin(profileId: string) {
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, roles')
      .eq('id', profileId)
      .single();

    if (findError || !profile) throw new Error('Usuário não encontrado');

    const newRoles = (profile.roles ?? []).filter((r: string) => r !== 'superadmin');
    const { error } = await supabase
      .from('profiles')
      .update({ roles: newRoles })
      .eq('id', profileId);
    if (error) throw error;
  },

  // ============================================================
  // MÉTRICAS DA PLATAFORMA
  // ============================================================

  async getPlatformStats(): Promise<PlatformStats> {
    const [orgsResult, profilesResult, cellsResult, membersResult, reportsResult] = await Promise.all([
      supabase.from('organizations').select('id, plan, created_at, subscription_status, name, max_cells, slug'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('cells').select('id', { count: 'exact', head: true }),
      supabase.from('members').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
    ]);

    const orgs = (orgsResult.data ?? []) as any[];
    const organizations: Organization[] = orgs.map(o => ({
      ...o,
      createdAt: o.created_at,
      plan: o.plan as PlanType,
      subscriptionStatus: o.subscription_status,
      maxCells: o.max_cells,
    }));

    return {
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter(o => o.subscriptionStatus !== 'suspended').length,
      suspendedOrganizations: organizations.filter(o => o.subscriptionStatus === 'suspended').length,
      totalProfiles: profilesResult.count ?? 0,
      totalCells: cellsResult.count ?? 0,
      totalMembers: membersResult.count ?? 0,
      totalReports: reportsResult.count ?? 0,
      organizations,
    };
  },

  async getOrganizationsWithCellCount(): Promise<Array<Organization & { cellCount: number }>> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*, cells(id)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((o: any) => ({
      ...o,
      createdAt: o.created_at,
      plan: o.plan as PlanType,
      subscriptionStatus: o.subscription_status,
      subscriptionId: o.subscription_id,
      maxCells: o.max_cells,
      cellCount: o.cells?.length ?? 0,
    }));
  },
};
