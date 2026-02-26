import { supabase } from '../../core/supabase/supabaseClient';
import { User, UserRole } from '../../shared/types/types';

export const getUsers = async (organizationId: string): Promise<User[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId);
    if (error) throw error;

    return (data || []).map((u: any) => ({
        ...u,
        organizationId: u.organization_id,
        roles: (u.roles as UserRole[]) || [],
        cellId: u.cell_id
    }));
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (error && error.code !== 'PGRST116') return undefined; // PGRST116 is 'no rows returned'
    if (data) {
        return {
            ...data,
            organizationId: data.organization_id,
            roles: (data.roles as UserRole[]) || [],
            cellId: data.cell_id
        };
    }
    return undefined;
};

export const getUserById = async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') return undefined;
    if (data) {
        return {
            ...data,
            organizationId: data.organization_id,
            roles: (data.roles as UserRole[]) || [],
            cellId: data.cell_id
        };
    }
    return undefined;
};

export const saveUser = async (user: User): Promise<void> => {
    const { error } = await supabase.from('profiles').insert({
        id: user.id,
        organization_id: user.organizationId,
        name: user.name,
        email: user.email,
        roles: user.roles,
        cell_id: user.cellId,
        birthday: user.birthday
    });
    if (error) throw error;
};

export const updateUser = async (user: User): Promise<void> => {
    const { error } = await supabase.from('profiles').update({
        organization_id: user.organizationId,
        name: user.name,
        email: user.email,
        roles: user.roles,
        cell_id: user.cellId,
        birthday: user.birthday
    }).eq('id', user.id);
    if (error) throw error;
};

export const deleteUser = async (id: string): Promise<void> => {
    // Chama a Edge Function que deleta do auth.users (e cascade no profile)
    const { error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: id },
    });

    if (fnError) {
        // Fallback: se a Edge Function não estiver deployada, apaga só o profile
        console.warn('Edge Function delete-user indisponível, removendo apenas o profile:', fnError);
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    }
};
