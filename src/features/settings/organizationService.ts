import { supabase } from '../../core/supabase/supabaseClient';
import { Organization, PlanType } from '../../shared/types/types';

export const getOrganizations = async (): Promise<Organization[]> => {
    const { data, error } = await supabase.from('organizations').select('*');
    if (error) throw error;
    return (data || []).map((o: any) => ({
        ...o,
        createdAt: o.created_at,
        plan: o.plan as PlanType,
        subscriptionStatus: o.subscription_status,
        subscriptionId: o.subscription_id,
        maxCells: o.max_cells
    }));
};

export const getOrganizationById = async (id: string): Promise<Organization | undefined> => {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows returned'
    if (data) {
        return {
            ...data,
            createdAt: (data as any).created_at,
            plan: (data as any).plan as PlanType,
            subscriptionStatus: (data as any).subscription_status,
            subscriptionId: (data as any).subscription_id,
            maxCells: (data as any).max_cells
        };
    }
    return undefined;
};

export const saveOrganization = async (org: Organization): Promise<void> => {
    const { error } = await supabase.from('organizations').insert(org);
    if (error) throw error;
};

export const updateOrganizationPlan = async (id: string, plan: PlanType): Promise<void> => {
    const maxCells = plan === 'free' ? 3 : plan === 'pro' ? 99999 : 99999;
    const { error } = await supabase
        .from('organizations')
        .update({ plan, max_cells: maxCells, subscription_status: 'active' })
        .eq('id', id);
    if (error) throw error;
};
