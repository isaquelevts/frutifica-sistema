import { apiFetch } from '../../core/api/client';
import { Member, MemberType } from '../../shared/types/types';

function mapMember(m: any): Member {
    return {
        id: m.id,
        name: m.name,
        cellId: m.cellId || '',
        organizationId: m.organizationId || '',
        active: m.active ?? true,
        type: MemberType.MEMBER,
        phone: m.phone,
        email: m.email,
        attendanceCount: m.attendanceCount || 0,
        firstVisitDate: m.firstVisitDate || m.createdAt || '',
        createdAt: m.createdAt || '',
    };
}

export const getMembers = async (organizationId: string): Promise<Member[]> => {
    const members = await apiFetch<any[]>(`/api/members?orgId=${organizationId}`);
    return (members || []).map(mapMember);
};

export const getMembersByCell = async (cellId: string): Promise<Member[]> => {
    const members = await apiFetch<any[]>(`/api/members/cell/${cellId}`);
    return (members || []).map(mapMember);
};

export const saveMember = async (member: Member): Promise<void> => {
    await apiFetch('/api/members', {
        method: 'POST',
        body: JSON.stringify({
            name: member.name,
            cellId: member.cellId,
            organizationId: member.organizationId,
        }),
    });
};

export const updateMember = async (member: Member): Promise<void> => {
    await apiFetch(`/api/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: member.name,
            cellId: member.cellId,
            active: member.active,
        }),
    });
};

export const deleteMember = async (id: string): Promise<void> => {
    await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
};
