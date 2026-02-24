import { supabase } from '../../core/supabase/supabaseClient';
import { Generation } from '../../shared/types/types';

export const getGenerations = async (organizationId: string): Promise<Generation[]> => {
    const { data, error } = await supabase.from('generations').select(`
        *,
        leader:profiles!generations_leader_id_fkey(name)
    `).eq('organization_id', organizationId);
    if (error) return [];

    return data.map((g: any) => ({
        ...g,
        organizationId: g.organization_id,
        leaderId: g.leader_id,
        leaderName: g.leader?.name || undefined,
        createdAt: g.created_at,
        updatedAt: g.updated_at
    }));
};

export const getGenerationById = async (id: string): Promise<Generation | undefined> => {
    const { data, error } = await supabase.from('generations').select(`
        *,
        leader:profiles!generations_leader_id_fkey(name)
    `).eq('id', id).single();
    if (error) return undefined;

    return {
        ...data,
        organizationId: data.organization_id,
        leaderId: data.leader_id,
        leaderName: data.leader?.name || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

export const saveGeneration = async (generation: Generation): Promise<void> => {
    const { error } = await supabase.from('generations').insert({
        id: generation.id,
        organization_id: generation.organizationId,
        name: generation.name,
        description: generation.description,
        leader_id: generation.leaderId,
        color: generation.color || '#3B82F6',
        active: generation.active
    });
    if (error) throw error;
};

export const updateGeneration = async (generation: Generation): Promise<void> => {
    const { error } = await supabase.from('generations').update({
        name: generation.name,
        description: generation.description,
        leader_id: generation.leaderId,
        color: generation.color,
        active: generation.active,
        updated_at: new Date().toISOString()
    }).eq('id', generation.id);
    if (error) throw error;
};

export const deleteGeneration = async (id: string): Promise<void> => {
    const { error } = await supabase.from('generations').delete().eq('id', id);
    if (error) throw error;
};
