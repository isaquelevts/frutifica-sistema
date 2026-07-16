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

export const saveCell = async (cell: Cell): Promise<Cell> => {
    const created = await apiFetch<any>('/api/cells', {
        method: 'POST',
        body: JSON.stringify({
            name: cell.name,
            leaderName: cell.leaderName,
            leaderId: cell.leaderId,
            leaderPhone: cell.whatsapp,
            targetAudience: cell.targetAudience,
            dayOfWeek: cell.dayOfWeek,
            time: cell.time,
            address: cell.address,
            active: cell.active,
            generationId: cell.generationId || null,
            organizationId: cell.organizationId,
        }),
    });
    return mapCell(created);
};

export interface SaveCellWithLeaderInput {
    name: string;
    leaderName: string;
    /** Telefone do líder — a API normaliza e usa nos lembretes do WhatsApp. */
    leaderPhone?: string;
    targetAudience?: string;
    dayOfWeek: string;
    time: string;
    address: string;
    generationId?: string | null;
    leaderEmail: string;
    leaderPassword?: string;
    leaderBirthday?: string;
}

export interface SaveCellWithLeaderResult {
    cell: Cell;
    leader: { id: string; email: string; name: string };
    temporaryPassword?: string;
}

/**
 * Cria célula + conta do líder numa transação única no servidor.
 * Antes eram duas chamadas em sequência: se a segunda falhasse (email já em uso,
 * por exemplo), a célula da primeira ficava órfã no banco.
 */
export const saveCellWithLeader = async (
    input: SaveCellWithLeaderInput
): Promise<SaveCellWithLeaderResult> => {
    const result = await apiFetch<any>('/api/cells/with-leader', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    return {
        cell: mapCell(result.cell),
        leader: result.leader,
        temporaryPassword: result.temporaryPassword,
    };
};

export const updateCell = async (cell: Cell): Promise<void> => {
    await apiFetch(`/api/cells/${cell.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: cell.name,
            leaderName: cell.leaderName,
            leaderId: cell.leaderId,
            leaderPhone: cell.whatsapp,
            targetAudience: cell.targetAudience,
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
        whatsapp: c.leaderPhone || '',
        targetAudience: c.targetAudience,
        coLeaders: [],
    };
}
