
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';
import { getProfile } from '../services/tripStore';
import { migrateLegacyIndexedDbToSupabase } from '../services/legacyMigration';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  cogniId: string | null;
  displayName: string | null;
  loading: boolean;
  supabaseReady: boolean;
  supabaseConnected: boolean;
  error: string | null;
  signInAnonymously: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
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

  const supabaseReady = isSupabaseConfigured();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      if (profile) {
        setCogniId(profile.cogniId);
        setDisplayName(profile.displayName);
      } else {
        setCogniId(`COG_${userId.slice(0, 8).toUpperCase()}`);
      }
    } catch {
      setCogniId(`COG_${userId.slice(0, 8).toUpperCase()}`);
    }
  }, []);

  const onAuthenticated = useCallback(async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.user) {
      await loadProfile(newSession.user.id);
      try {
        await migrateLegacyIndexedDbToSupabase(newSession.user.id);
      } catch (e) {
        console.warn('Legacy migration skipped', e);
      }
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

    checkSupabaseConnection().then(setSupabaseConnected);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      onAuthenticated(s).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      onAuthenticated(s);
    });

    return () => subscription.unsubscribe();
  }, [supabaseReady, onAuthenticated]);

  const signInAnonymously = async () => {
    setError(null);
    const { error: err } = await getSupabase().auth.signInAnonymously();
    if (err) {
      if (err.message.includes('anonymous') || (err as { error_code?: string }).error_code === 'anonymous_provider_disabled') {
        setError('Anonymous sign-in is disabled in Supabase. Enable it under Authentication → Providers → Anonymous, or use email sign-in below.');
      } else {
        setError(err.message);
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    const { error: err } = await getSupabase().auth.signUp({ email, password });
    if (err) setError(err.message);
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
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
        signInAnonymously,
        signInWithEmail,
        signUpWithEmail,
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
