import { useQuery } from '@tanstack/react-query';
import { getCells, getCellById } from '../../features/cells/cellService';

export const useCells = (organizationId?: string) => {
    return useQuery({
        queryKey: ['cells', organizationId],
        queryFn: () => getCells(organizationId!),
        enabled: !!organizationId,
    });
};

export const useCell = (cellId?: string) => {
    return useQuery({
        queryKey: ['cells', cellId],
        queryFn: () => getCellById(cellId!),
        enabled: !!cellId,
    });
};
