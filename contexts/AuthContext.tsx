
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';
import { getProfile } from '../services/tripStore';
import { getSignupRedirectUrl, type AuthRedirectNotice } from '../services/authRedirect';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  cogniId: string | null;
  displayName: string | null;
  loading: boolean;
  supabaseReady: boolean;
  supabaseConnected: boolean;
  error: string | null;
  authNotice: AuthRedirectNotice | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LEGAL_DOCUMENT_VERSION = '2026-10-28.2';

export const AuthProvider: React.FC<{ children: React.ReactNode; authRedirect?: AuthRedirectNotice | null }> = ({ children, authRedirect = null }) => {
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

    let active = true;
    let initializing = true;

    const initialize = async () => {
      try {
        // Confirmation verifies the email, then requires an explicit password login.
        // Clear any existing local session rather than silently opening the app.
        if (authRedirect) {
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
          if (signOutError) throw signOutError;
        }
        if (!active) return;
        const { data: { session: s }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (active) await onAuthenticated(s);
      } catch {
        if (active) setError('We could not initialize your session. Refresh the page and try signing in again.');
      } finally {
        initializing = false;
        if (active) setLoading(false);
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (initializing) return;
      window.setTimeout(() => { if (active) void onAuthenticated(s); }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearInterval(connectionInterval);
      window.removeEventListener('online', refreshConnection);
      window.removeEventListener('offline', markOffline);
    };
  }, [supabaseReady, onAuthenticated, authRedirect]);

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
    const emailRedirectTo = getSignupRedirectUrl(window.location.origin);
    const { error: err } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          legal_document_version: LEGAL_DOCUMENT_VERSION,
          legal_accepted_at: new Date().toISOString(),
          age_18_confirmed: true,
        },
      },
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

  const resendConfirmation = async (email: string) => {
    setError(null);
    const { error: err } = await getSupabase().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getSignupRedirectUrl(window.location.origin) },
    });
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
        authNotice: authRedirect,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        resendConfirmation,
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
