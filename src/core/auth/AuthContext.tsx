
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Organization } from '../../shared/types/types';
import { supabase } from '../supabase/supabaseClient';
import { getUserByEmail, getUserById } from '../../features/settings/profileService';
import { getOrganizationById } from '../../features/settings/organizationService';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (userId: string, email: string): Promise<User | null> => {
    console.log('[AuthContext] Loading profile for:', userId);
    try {
      // Fetch using ID which is safer with RLS
      let profile = await getUserById(userId);
      console.log('[AuthContext] getUserById result:', profile);

      // Fallback to email if ID fetch fails (just in case)
      if (!profile) {
        console.log('[AuthContext] Fallback to email search...');
        profile = await getUserByEmail(email);
      }

      if (profile) {
        console.log('[AuthContext] Profile found, setting user state.');
        setUser(profile);
        // Fetch Organization
        if (profile.organizationId) {
          const org = await getOrganizationById(profile.organizationId);
          console.log('[AuthContext] Organization loaded:', org);
          if (org) setOrganization(org);
        }
        return profile;
      } else {
        console.warn('[AuthContext] No profile found for user.');
        return null;
      }
    } catch (e) {
      console.error("[AuthContext] Error loading profile", e);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state change:', event, session?.user?.email);

      if (event === 'PASSWORD_RECOVERY') {
        // Redirect to reset password page - safe to use window.location for HashRouter
        window.location.hash = '#/reset-password';
      }

      if (session?.user?.email) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setOrganization(null);
        setIsLoading(false); // Ensure loading is stopped if no session
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; roles?: UserRole[] }> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
      setIsLoading(false);
      return { success: false };
    }

    if (data.user) {
      const profile = await loadProfile(data.user.id, data.user.email || '');
      return { success: true, roles: profile?.roles };
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
  };

  const reloadOrganization = () => {
    if (user?.organizationId) {
      getOrganizationById(user.organizationId).then(org => {
        if (org) setOrganization(org);
      });
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://sistemafrutifica.com/',
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ocorreu um erro inesperado' };
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
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};