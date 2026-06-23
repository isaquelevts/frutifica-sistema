import { apiFetch } from '../../core/api/client';
import { Generation } from '../../shared/types/types';

function mapGeneration(g: any): Generation {
    return {
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        active: g.active ?? true,
        leaderId: g.leaderId,
        leaderName: g.leaderName,
        organizationId: g.organizationId,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
    };
}

export const getGenerations = async (organizationId: string): Promise<Generation[]> => {
    const generations = await apiFetch<any[]>(`/api/generations?orgId=${organizationId}`);
    return (generations || []).map(mapGeneration);
};

export const getGenerationById = async (id: string): Promise<Generation | undefined> => {
    try {
        const g = await apiFetch<any>(`/api/generations/${id}`);
        return g ? mapGeneration(g) : undefined;
    } catch {
        return undefined;
    }
};

export const saveGeneration = async (generation: Generation): Promise<void> => {
    await apiFetch('/api/generations', {
        method: 'POST',
        body: JSON.stringify({
            id: generation.id,
            name: generation.name,
            description: generation.description,
            color: generation.color || '#3B82F6',
            active: generation.active,
            leaderId: generation.leaderId,
            organizationId: generation.organizationId,
        }),
    });
};

export const updateGeneration = async (generation: Generation): Promise<void> => {
    await apiFetch(`/api/generations/${generation.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: generation.name,
            description: generation.description,
            color: generation.color,
            active: generation.active,
            leaderId: generation.leaderId,
        }),
    });
};

export const deleteGeneration = async (id: string): Promise<void> => {
    await apiFetch(`/api/generations/${id}`, { method: 'DELETE' });
};
