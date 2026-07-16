import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getInvites,
    createInvite,
    revokeInvite,
    getInvitePreview,
    type CreateInviteInput,
} from '../../features/invites/inviteService';

export const useInvites = (enabled = true) => {
    return useQuery({
        queryKey: ['invites'],
        queryFn: getInvites,
        enabled,
    });
};

export const useCreateInvite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateInviteInput) => createInvite(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invites'] });
        },
    });
};

export const useRevokeInvite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => revokeInvite(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invites'] });
        },
    });
};

/** Rota pública — não depende de sessão. */
export const useInvitePreview = (token?: string) => {
    return useQuery({
        queryKey: ['invite-preview', token],
        queryFn: () => getInvitePreview(token!),
        enabled: !!token,
        retry: false, // 404/410 são respostas finais, não falhas de rede
    });
};
