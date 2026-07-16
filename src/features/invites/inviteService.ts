import { apiFetch } from '../../core/api/client';

export type InviteStatus = 'active' | 'revoked' | 'expired' | 'exhausted';

export interface Invite {
    id: string;
    token: string;
    organizationId: string;
    generationId?: string | null;
    generationName?: string | null;
    role: string;
    label?: string | null;
    maxUses?: number | null;
    uses: number;
    expiresAt?: string | null;
    revokedAt?: string | null;
    createdAt: string;
    status: InviteStatus;
}

export interface CreateInviteInput {
    generationId?: string;
    label?: string;
    maxUses?: number;
    expiresInDays?: number;
}

/** Dados públicos do convite, para montar a tela antes do cadastro. */
export interface InvitePreview {
    organizationName: string;
    generationName: string | null;
    role: string;
    label: string | null;
}

export interface AcceptInviteInput {
    name: string;
    email: string;
    password: string;
    cellName: string;
    leaderName: string;
    leaderPhone?: string;
    dayOfWeek: string;
    time: string;
    address: string;
    targetAudience?: string;
}

export const getInvites = async (): Promise<Invite[]> => {
    return apiFetch<Invite[]>('/api/invites');
};

export const createInvite = async (input: CreateInviteInput): Promise<Invite> => {
    return apiFetch<Invite>('/api/invites', {
        method: 'POST',
        body: JSON.stringify(input),
    });
};

export const revokeInvite = async (id: string): Promise<void> => {
    await apiFetch(`/api/invites/${id}`, { method: 'DELETE' });
};

export const getInvitePreview = async (token: string): Promise<InvitePreview> => {
    return apiFetch<InvitePreview>(`/api/invites/token/${encodeURIComponent(token)}`);
};

export const acceptInvite = async (
    token: string,
    input: AcceptInviteInput
): Promise<{ token: string; user: any; cell: { id: string; name: string } }> => {
    return apiFetch(`/api/invites/token/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
};

/** Link completo para compartilhar com o líder. */
export const buildInviteUrl = (token: string): string => {
    return `${window.location.origin}/#/convite/${token}`;
};
