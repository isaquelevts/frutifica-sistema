import { apiFetch } from '../../core/api/client';
import { User, UserRole } from '../../shared/types/types';

function mapUser(u: any): User {
    return {
        id: u.id,
        email: u.email,
        name: u.name || '',
        roles: (u.roles as UserRole[]) || [],
        cellId: u.cellId,
        organizationId: u.organizationId,
        birthday: u.birthday,
    };
}

export const getUsers = async (organizationId: string): Promise<User[]> => {
    const users = await apiFetch<any[]>(`/api/users?orgId=${organizationId}`);
    return (users || []).map(mapUser);
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
    try {
        const user = await apiFetch<any>(`/api/users/by-email/${encodeURIComponent(email)}`);
        return user ? mapUser(user) : undefined;
    } catch {
        return undefined;
    }
};

export const getUserById = async (id: string): Promise<User | undefined> => {
    try {
        const user = await apiFetch<any>(`/api/users/${id}`);
        return user ? mapUser(user) : undefined;
    } catch {
        return undefined;
    }
};

export const saveUser = async (user: User & { password?: string }): Promise<{ temporaryPassword?: string }> => {
    const result = await apiFetch<any>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
            email: user.email,
            name: user.name,
            roles: user.roles,
            cellId: user.cellId,
            organizationId: user.organizationId,
            birthday: user.birthday,
            password: user.password,
        }),
    });
    return { temporaryPassword: result?.temporaryPassword };
};

export const updateUser = async (user: User): Promise<void> => {
    await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: user.name,
            email: user.email,
            roles: user.roles,
            cellId: user.cellId,
            birthday: user.birthday,
        }),
    });
};

export const deleteUser = async (id: string): Promise<void> => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
};
