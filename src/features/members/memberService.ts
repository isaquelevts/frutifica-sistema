import { supabase } from '../../core/supabase/supabaseClient';
import { Member } from '../../shared/types/types';

export const getMembers = async (organizationId: string): Promise<Member[]> => {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('organization_id', organizationId);
    if (error) throw error;

    return (data || []).map((m: any) => ({
        ...m,
        organizationId: m.organization_id,
        cellId: m.cell_id,
        firstVisitDate: m.first_visit_date,
        attendanceCount: m.attendance_count
    }));
};

export const getMembersByCell = async (cellId: string): Promise<Member[]> => {
    const { data, error } = await supabase.from('members').select('*').eq('cell_id', cellId).eq('active', true);
    if (error) throw error;
    return (data || []).map((m: any) => ({
        ...m,
        organizationId: m.organization_id,
        cellId: m.cell_id,
        firstVisitDate: m.first_visit_date,
        attendanceCount: m.attendance_count
    }));
};

export const saveMember = async (member: Member): Promise<void> => {
    const { error } = await supabase.from('members').insert({
        id: member.id,
        organization_id: member.organizationId,
        cell_id: member.cellId,
        name: member.name,
        phone: member.phone,
        email: member.email,
        type: member.type,
        attendance_count: member.attendanceCount,
        first_visit_date: member.firstVisitDate,
        active: member.active
    });
    if (error) throw error;
};

export const updateMember = async (member: Member): Promise<void> => {
    const { error } = await supabase.from('members').update({
        organization_id: member.organizationId,
        cell_id: member.cellId,
        name: member.name,
        phone: member.phone,
        email: member.email,
        birthday: member.birthday,
        type: member.type,
        attendance_count: member.attendanceCount,
        first_visit_date: member.firstVisitDate,
        active: member.active
    }).eq('id', member.id);
    if (error) throw error;
};

export const incrementAttendance = async (memberIds: string[]): Promise<void> => {
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

        const newCount = (data?.attendance_count || 0) + 1;

        const { error: updateError } = await supabase
            .from('members')
            .update({ attendance_count: newCount })
            .eq('id', id);

        if (updateError) {
            console.error(`Erro ao atualizar frequência do membro ${id}:`, updateError);
        }
    }
};

export const deleteMember = async (id: string): Promise<void> => {
    const { error } = await supabase.from('members').update({ active: false }).eq('id', id);
    if (error) throw error;
};
