
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';
import { getProfile } from '../services/tripStore';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  cogniId: string | null;
  displayName: string | null;
  loading: boolean;
  supabaseReady: boolean;
  supabaseConnected: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cogniId, setCogniId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authRevision = React.useRef(0);

  const supabaseReady = isSupabaseConfigured();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      return profile ?? { cogniId: `COG_${userId.replace(/-/g, '').slice(0, 20).toUpperCase()}`, displayName: 'Driver' };
    } catch {
      return { cogniId: `COG_${userId.replace(/-/g, '').slice(0, 20).toUpperCase()}`, displayName: 'Driver' };
    }
  }, []);

  const onAuthenticated = useCallback(async (newSession: Session | null) => {
    const revision = ++authRevision.current;
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.user) {
      const profile = await loadProfile(newSession.user.id);
      if (revision !== authRevision.current) return;
      setCogniId(profile.cogniId);
      setDisplayName(profile.displayName);
    } else {
      setCogniId(null);
      setDisplayName(null);
    }
  }, [loadProfile]);

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    const refreshConnection = () => { void checkSupabaseConnection().then(setSupabaseConnected); };
    const markOffline = () => setSupabaseConnected(false);
    refreshConnection();
    const connectionInterval = window.setInterval(refreshConnection, 60_000);
    window.addEventListener('online', refreshConnection);
    window.addEventListener('offline', markOffline);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      onAuthenticated(s).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      window.setTimeout(() => { void onAuthenticated(s); }, 0);
    });

    return () => {
      subscription.unsubscribe();
      window.clearInterval(connectionInterval);
      window.removeEventListener('online', refreshConnection);
      window.removeEventListener('offline', markOffline);
    };
  }, [supabaseReady, onAuthenticated]);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    const emailRedirectTo = `${window.location.origin}/`;
    const { error: err } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (err) {
      setError(err.message);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    const redirectTo = `${window.location.origin}/`;
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
    if (err) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
  };

  const deleteAccount = async () => {
    setError(null);
    const { error: err } = await getSupabase().functions.invoke('delete-account', { body: {} });
    if (err) {
      setError(err.message);
      throw err;
    }
    await getSupabase().auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        cogniId,
        displayName,
        loading,
        supabaseReady,
        supabaseConnected,
        error,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        deleteAccount,
        signOut,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
