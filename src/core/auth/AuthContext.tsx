import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Organization } from '../../shared/types/types';
import { apiFetch, setToken, getToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  login: (email: string, password: string) => Promise<{ success: boolean; roles?: UserRole[] }>;
  logout: () => void;
  reloadOrganization: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapApiUser(u: any): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name || '',
    roles: u.roles || [],
    cellId: u.cellId,
    organizationId: u.organizationId,
    birthday: u.birthday,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrg = async (orgId: string) => {
    try {
      const org = await apiFetch<any>(`/api/organizations/${orgId}`);
      if (org) setOrganization({
        id: org.id,
        name: org.name,
        plan: org.plan,
        maxCells: org.maxCells,
        subscriptionStatus: org.subscriptionStatus,
        createdAt: org.createdAt,
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    apiFetch<{ user: any }>('/api/auth/me')
      .then(async ({ user: u }) => {
        const mapped = mapApiUser(u);
        setUser(mapped);
        if (mapped.organizationId) await loadOrg(mapped.organizationId);
      })
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; roles?: UserRole[] }> => {
    setIsLoading(true);
    try {
      const { token, user: u } = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(token);
      const mapped = mapApiUser(u);
      setUser(mapped);
      if (mapped.organizationId) await loadOrg(mapped.organizationId);
      return { success: true, roles: mapped.roles };
    } catch (err: any) {
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const reloadOrganization = () => {
    if (user?.organizationId) loadOrg(user.organizationId);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      login,
      logout,
      reloadOrganization,
      resetPassword,
      isAuthenticated: !!user,
      isSuperAdmin: user?.roles?.includes(UserRole.SUPERADMIN) || false,
      isAdmin: user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes(UserRole.SUPERADMIN) || false,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
