import { apiFetch } from '../../core/api/client';
import { Organization, PlanType } from '../../shared/types/types';

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

export const getOrganizations = async (): Promise<Organization[]> => {
    const orgs = await apiFetch<any[]>('/api/organizations');
    return (orgs || []).map(mapOrg);
};

export const getOrganizationById = async (id: string): Promise<Organization | undefined> => {
    try {
        const org = await apiFetch<any>(`/api/organizations/${id}`);
        return org ? mapOrg(org) : undefined;
    } catch {
        return undefined;
    }
};

export const saveOrganization = async (org: Organization): Promise<void> => {
    await apiFetch('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(org),
    });
};

export const updateOrganizationPlan = async (id: string, plan: PlanType): Promise<void> => {
    const maxCells = plan === 'free' ? 3 : 99999;
    await apiFetch(`/api/organizations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ plan, maxCells, subscriptionStatus: 'active' }),
    });
};
