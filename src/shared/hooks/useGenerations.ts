import { useQuery } from '@tanstack/react-query';
import { getGenerations } from '../../features/generations/generationService';

export const useGenerations = (organizationId?: string) => {
    return useQuery({
        queryKey: ['generations', organizationId],
        queryFn: () => getGenerations(organizationId),
        enabled: !!organizationId,
    });
};
