import { supabase } from '../../core/supabase/supabaseClient';
import { Report } from '../../shared/types/types';

export const getReports = async (organizationId: string): Promise<Report[]> => {
    const { data, error } = await supabase.from('reports').select(`
        *,
        cells (
            name
        )
    `).eq('organization_id', organizationId);
    if (error) throw error;
    return (data || []).map((r: any) => ({
        ...r,
        organizationId: r.organization_id,
        cellId: r.cell_id,
        cellName: r.cells?.name || 'Célula não encontrada', // Use joined cell name
        attendanceList: r.attendance_list,
        conversionsList: r.conversions_list,
        newVisitorsList: r.new_visitors_list,
        createdAt: r.created_at
    }));
};

export const getReportById = async (id: string): Promise<Report | undefined> => {
    const { data, error } = await supabase.from('reports').select(`
        *,
        cells (
            name
        )
    `).eq('id', id).single();
    if (error) return undefined;
    const r = data as any;
    return {
        ...r,
        organizationId: r.organization_id,
        cellId: r.cell_id,
        cellName: r.cells?.name || 'Célula não encontrada',
        attendanceList: r.attendance_list,
        conversionsList: r.conversions_list,
        newVisitorsList: r.new_visitors_list,
        createdAt: r.created_at
    };
};

export const deleteReport = async (id: string): Promise<void> => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
};

export const decrementAttendance = async (memberIds: string[]): Promise<void> => {
    if (!memberIds.length) return;

    for (const id of memberIds) {
        const { data, error: fetchError } = await supabase
            .from('members')
            .select('attendance_count')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error(`Erro ao buscar frequência do membro ${id}:`, fetchError);
            continue;
        }

        const newCount = Math.max(0, (data?.attendance_count || 0) - 1);

        const { error: updateError } = await supabase
            .from('members')
            .update({ attendance_count: newCount })
            .eq('id', id);

        if (updateError) {
            console.error(`Erro ao atualizar frequência do membro ${id}:`, updateError);
        }
    }
};

export const saveReport = async (report: Report): Promise<void> => {
    const { error } = await supabase.from('reports').insert({
        id: report.id,
        organization_id: report.organizationId,
        cell_id: report.cellId,
        happened: report.happened,
        participants: report.participants,
        visitors: report.visitors,
        conversions: report.conversions,
        attendance_list: report.attendanceList,
        conversions_list: report.conversionsList,
        new_visitors_list: report.newVisitorsList,
        date: report.date,
        notes: report.notes
    });
    if (error) throw error;
};

export const updateReport = async (report: Report): Promise<void> => {
    const { error } = await supabase.from('reports').update({
        organization_id: report.organizationId,
        cell_id: report.cellId,
        happened: report.happened,
        participants: report.participants,
        visitors: report.visitors,
        conversions: report.conversions,
        attendance_list: report.attendanceList,
        conversions_list: report.conversionsList,
        new_visitors_list: report.newVisitorsList,
        date: report.date,
        notes: report.notes
    }).eq('id', report.id);
    if (error) throw error;
};
