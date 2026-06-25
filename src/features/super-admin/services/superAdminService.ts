import { apiFetch } from '../../../core/api/client';
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

function mapOrg(o: any): Organization {
  return {
    id: o.id,
    name: o.name,
    plan: o.plan as PlanType,
    maxCells: o.maxCells,
    subscriptionStatus: o.subscriptionStatus,
    createdAt: o.createdAt,
  };
}

export const superAdminService = {
  async getAllOrganizations(): Promise<Organization[]> {
    const orgs = await apiFetch<any[]>('/api/superadmin/organizations');
    return orgs.map(mapOrg);
  },

  async getOrganizationWithStats(orgId: string): Promise<OrgWithStats> {
    const data = await apiFetch<any>(`/api/superadmin/organizations/${orgId}`);
    return {
      organization: mapOrg(data.organization),
      cellCount: data.cellCount,
      memberCount: data.memberCount,
      userCount: data.userCount,
      reportCount: data.reportCount,
      profiles: data.profiles,
    };
  },

  async getOrganizationCells(orgId: string) {
    return apiFetch<any[]>(`/api/superadmin/organizations/${orgId}/cells`);
  },

  async getOrganizationGenerations(orgId: string) {
    return apiFetch<any[]>(`/api/superadmin/organizations/${orgId}/generations`);
  },

  async getOrganizationReportsByWeek(orgId: string) {
    return apiFetch<any[]>(`/api/superadmin/organizations/${orgId}/reports-by-week`);
  },

  async updateOrganizationName(orgId: string, name: string) {
    await apiFetch(`/api/superadmin/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  async updateOrganizationPlan(orgId: string, plan: PlanType, maxCells: number) {
    return apiFetch(`/api/superadmin/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify({ plan, maxCells, subscriptionStatus: 'active' }),
    });
  },

  async suspendOrganization(orgId: string) {
    await apiFetch(`/api/superadmin/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify({ subscriptionStatus: 'suspended' }),
    });
  },

  async reactivateOrganization(orgId: string) {
    await apiFetch(`/api/superadmin/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify({ subscriptionStatus: 'active' }),
    });
  },

  async deleteOrganization(orgId: string) {
    await apiFetch(`/api/superadmin/organizations/${orgId}`, { method: 'DELETE' });
  },

  async getSuperAdmins() {
    return apiFetch<any[]>('/api/superadmin/superadmins');
  },

  async addSuperAdmin(email: string) {
    await apiFetch('/api/superadmin/superadmins', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async removeSuperAdmin(profileId: string) {
    await apiFetch(`/api/superadmin/superadmins/${profileId}`, { method: 'DELETE' });
  },

  async getPlatformStats(): Promise<PlatformStats> {
    const data = await apiFetch<any>('/api/superadmin/stats');
    return {
      ...data,
      organizations: (data.organizations || []).map(mapOrg),
    };
  },

  async getOrganizationsWithCellCount(): Promise<Array<Organization & { cellCount: number }>> {
    const orgs = await apiFetch<any[]>('/api/superadmin/organizations');
    return orgs.map((o) => ({ ...mapOrg(o), cellCount: o.cellCount ?? 0 }));
  },
};
