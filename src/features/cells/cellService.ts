import { supabase } from '../../core/supabase/supabaseClient';
import { Cell } from '../../shared/types/types';

export const getCells = async (organizationId: string): Promise<Cell[]> => {
    const { data, error } = await supabase
        .from('cells')
        .select('*')
        .eq('organization_id', organizationId);

    return (data || []).map((c: any) => ({
        ...c,
        organizationId: c.organization_id,
        leaderName: c.leader_name,
        leaderId: (c as any).leader_id,
        dayOfWeek: c.day_of_week,
        targetAudience: c.target_audience,
        generationId: c.generation_id,
        coLeaders: c.co_leaders || []
    }));
};

export const getCellById = async (id: string): Promise<Cell | undefined> => {
    const { data, error } = await supabase.from('cells').select('*').eq('id', id).single();
    if (error) return undefined;
    const c = data as any;
    return {
        ...c,
        organizationId: c.organization_id,
        leaderName: c.leader_name,
        leaderId: c.leader_id,
        dayOfWeek: c.day_of_week,
        targetAudience: c.target_audience,
        generationId: c.generation_id,
        coLeaders: c.co_leaders || []
    };
};

export const saveCell = async (cell: Cell): Promise<void> => {
    const { error } = await supabase.from('cells').insert({
        id: cell.id,
        organization_id: cell.organizationId,
        name: cell.name,
        leader_name: cell.leaderName,
        whatsapp: cell.whatsapp,
        day_of_week: cell.dayOfWeek,
        time: cell.time,
        address: cell.address,
        target_audience: cell.targetAudience,
        generation_id: cell.generationId || null,
        active: cell.active,
        co_leaders: cell.coLeaders as any
    });
    if (error) throw error;
};

export const updateCell = async (cell: Cell): Promise<void> => {
    const { error } = await supabase.from('cells').update({
        organization_id: cell.organizationId,
        name: cell.name,
        leader_name: cell.leaderName,
        whatsapp: cell.whatsapp,
        day_of_week: cell.dayOfWeek,
        time: cell.time,
        address: cell.address,
        target_audience: cell.targetAudience,
        generation_id: cell.generationId || null,
        active: cell.active,
        co_leaders: cell.coLeaders as any
    }).eq('id', cell.id);
    if (error) throw error;
};

export const deleteCell = async (cellId: string, deleteRelated: boolean): Promise<void> => {
    if (deleteRelated) {
        const { error: membersError } = await supabase.from('members').delete().eq('cell_id', cellId);
        if (membersError) throw new Error(`Erro ao excluir membros: ${membersError.message}`);

        const { error: reportsError } = await supabase.from('reports').delete().eq('cell_id', cellId);
        if (reportsError) throw new Error(`Erro ao excluir relatórios: ${reportsError.message}`);
    }

    // Desvincula líderes que apontavam para esta célula
    await supabase.from('profiles').update({ cell_id: null }).eq('cell_id', cellId);

    const { error } = await supabase.from('cells').delete().eq('id', cellId);
    if (error) throw new Error(`Erro ao excluir célula: ${error.message}`);
};
