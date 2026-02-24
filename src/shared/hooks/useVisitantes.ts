import { useQuery } from '@tanstack/react-query';
import { getVisitantes } from '../../features/consolidation/visitanteService';

export const useVisitantes = (organizationId?: string) => {
    return useQuery({
        queryKey: ['visitantes', organizationId],
        queryFn: () => getVisitantes(organizationId!),
        enabled: !!organizationId,
    });
};
