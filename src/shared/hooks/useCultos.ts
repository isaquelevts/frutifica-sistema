import { useQuery } from '@tanstack/react-query';
import { getCultos } from '../../features/consolidation/cultoService';

export const useCultos = (organizationId?: string) => {
    return useQuery({
        queryKey: ['cultos', organizationId],
        queryFn: () => getCultos(organizationId!),
        enabled: !!organizationId,
    });
};
