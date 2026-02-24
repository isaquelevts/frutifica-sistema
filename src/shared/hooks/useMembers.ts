import { useQuery } from '@tanstack/react-query';
import { getMembers } from '../../features/members/memberService';

export const useMembers = (organizationId?: string) => {
    return useQuery({
        queryKey: ['members', organizationId],
        queryFn: () => getMembers(organizationId!),
        enabled: !!organizationId,
    });
};

export const useMembersByCell = (cellId?: string) => {
    return useQuery({
        queryKey: ['members', 'cell', cellId],
        queryFn: async () => {
            const { getMembersByCell } = await import('../../features/members/memberService');
            return getMembersByCell(cellId!);
        },
        enabled: !!cellId,
    });
};
