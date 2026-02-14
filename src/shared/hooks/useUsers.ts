import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../features/settings/profileService';

export const useUsers = (organizationId?: string) => {
    return useQuery({
        queryKey: ['users', organizationId],
        queryFn: () => getUsers(organizationId),
        enabled: !!organizationId,
    });
};
