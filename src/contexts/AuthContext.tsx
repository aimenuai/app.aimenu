import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: 'client' | 'reseller' | 'admin' | null;
  effectiveUserId: string | null;
  isImpersonating: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'client' | 'reseller' | 'admin' | null>(null);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRole(session.user.id);
        checkImpersonation(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRole(session.user.id);
          checkImpersonation(session.user.id);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('client');
        setLoading(false);
        return;
      }

      if (data) {
        setUserRole(data.role);
      } else {
        setUserRole('client');
      }
      setLoading(false);
    } catch (error) {
      console.error('Exception fetching user role:', error);
      setUserRole('client');
      setLoading(false);
    }
  };

  const checkImpersonation = (userId: string) => {
    const impersonatingId = localStorage.getItem('impersonating_user_id');
    if (impersonatingId) {
      setIsImpersonating(true);
      setEffectiveUserId(impersonatingId);
    } else {
      setIsImpersonating(false);
      // Set effectiveUserId to current user's ID
      setEffectiveUserId(userId);
    }
  };

  const stopImpersonating = () => {
    localStorage.removeItem('impersonating_user_id');
    setIsImpersonating(false);
    setEffectiveUserId(user?.id || null);
    window.location.href = userRole === 'admin' ? '/admin' : '/reseller';
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Check if user is disabled
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_disabled')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user status:', profileError);
      }

      if (profile?.is_disabled) {
        await supabase.auth.signOut();
        throw new Error('Your account has been disabled. Please contact support.');
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user };
  };

  const signOut = async () => {
    localStorage.removeItem('impersonating_user_id');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    effectiveUserId,
    isImpersonating,
    signIn,
    signUp,
    signOut,
    stopImpersonating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
