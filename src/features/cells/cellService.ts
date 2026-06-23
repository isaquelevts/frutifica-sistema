import { apiFetch } from '../../core/api/client';
import { Cell } from '../../shared/types/types';

export const getCells = async (organizationId: string): Promise<Cell[]> => {
    const cells = await apiFetch<any[]>(`/api/cells?orgId=${organizationId}`);
    return (cells || []).map(mapCell);
};

export const getCellById = async (id: string): Promise<Cell | undefined> => {
    try {
        const cell = await apiFetch<any>(`/api/cells/${id}`);
        return cell ? mapCell(cell) : undefined;
    } catch {
        return undefined;
    }
};

export const saveCell = async (cell: Cell): Promise<void> => {
    await apiFetch('/api/cells', {
        method: 'POST',
        body: JSON.stringify({
            name: cell.name,
            leaderName: cell.leaderName,
            leaderId: cell.leaderId,
            dayOfWeek: cell.dayOfWeek,
            time: cell.time,
            address: cell.address,
            active: cell.active,
            generationId: cell.generationId || null,
            organizationId: cell.organizationId,
        }),
    });
};

export const updateCell = async (cell: Cell): Promise<void> => {
    await apiFetch(`/api/cells/${cell.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: cell.name,
            leaderName: cell.leaderName,
            leaderId: cell.leaderId,
            dayOfWeek: cell.dayOfWeek,
            time: cell.time,
            address: cell.address,
            active: cell.active,
            generationId: cell.generationId || null,
        }),
    });
};

export const deleteCell = async (cellId: string, deleteRelated: boolean): Promise<void> => {
    await apiFetch(`/api/cells/${cellId}?deleteRelated=${deleteRelated}`, { method: 'DELETE' });
};

function mapCell(c: any): Cell {
    return {
        id: c.id,
        name: c.name,
        leaderName: c.leaderName || '',
        leaderId: c.leaderId,
        dayOfWeek: c.dayOfWeek || '',
        time: c.time || '',
        address: c.address || '',
        active: c.active ?? true,
        generationId: c.generationId,
        organizationId: c.organizationId,
        whatsapp: '',
        targetAudience: c.targetAudience,
        coLeaders: [],
    };
}
