
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';
import { getProfile } from '../services/tripStore';
import { getSignupRedirectUrl, getPasswordRecoveryRedirectUrl, type AuthRedirectNotice } from '../services/authRedirect';
import { MIN_PASSWORD_LENGTH } from '../services/passwordValidation';
import { hasRecentPasswordSignIn } from '../supabase/functions/_shared/recentAuthentication';

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
  isPasswordRecovery: boolean;
  recoverySessionReady: boolean;
  updatePassword: (password: string) => Promise<void>;
  exitPasswordRecovery: () => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode; authRedirect?: AuthRedirectNotice | null; passwordRecovery?: boolean }> = ({ children, authRedirect = null, passwordRecovery = false }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cogniId, setCogniId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<AuthRedirectNotice | null>(authRedirect);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(passwordRecovery);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
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
    let authEventSequence = 0;

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
        if (active) {
          if (passwordRecovery) {
            setRecoverySessionReady(Boolean(s));
            if (!s) setError('This password-reset link is invalid or expired. Return to sign in and request a new reset email.');
            // Preserve the recovery screen on refresh, but never retain tokens/errors.
            window.history.replaceState(null, '', '/?auth=recovery');
          }
          await onAuthenticated(s);
        }
      } catch {
        if (active) {
          setError(passwordRecovery
            ? 'This password-reset link could not be verified. Return to sign in and request a new reset email.'
            : 'We could not initialize your session. Refresh the page and try signing in again.');
          if (passwordRecovery) window.history.replaceState(null, '', '/?auth=recovery');
        }
      } finally {
        initializing = false;
        if (active) setLoading(false);
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      const eventSequence = ++authEventSequence;
      if (event === 'PASSWORD_RECOVERY' && active) {
        setIsPasswordRecovery(true);
        setRecoverySessionReady(Boolean(s));
      }
      if (event === 'SIGNED_OUT' && active) setRecoverySessionReady(false);
      if (initializing) return;
      window.setTimeout(() => {
        if (active && eventSequence === authEventSequence) void onAuthenticated(s);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearInterval(connectionInterval);
      window.removeEventListener('online', refreshConnection);
      window.removeEventListener('offline', markOffline);
    };
  }, [supabaseReady, onAuthenticated, authRedirect, passwordRecovery]);

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
    const redirectTo = getPasswordRecoveryRedirectUrl(window.location.origin);
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
    const { error: err } = await getSupabase().auth.signOut();
    if (err) throw err;
  };

  const exitPasswordRecovery = async () => {
    const { error: err } = supabaseReady
      ? await getSupabase().auth.signOut({ scope: 'local' })
      : { error: null };
    if (err) {
      setError('Could not end the recovery session. Please try again.');
      throw err;
    }
    await onAuthenticated(null);
    setIsPasswordRecovery(false);
    setRecoverySessionReady(false);
    setError(null);
    window.history.replaceState(null, '', '/login');
  };

  const updatePassword = async (password: string) => {
    setError(null);
    if (!isPasswordRecovery || !recoverySessionReady || !session) {
      const err = new Error('Open a valid password-reset link before choosing a new password.');
      setError(err.message);
      throw err;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      const err = new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
      setError(err.message);
      throw err;
    }
    const { error: err } = await getSupabase().auth.updateUser({ password });
    if (err) {
      setError(err.message);
      throw err;
    }
    try {
      await exitPasswordRecovery();
    } catch (signOutError) {
      setError('Your password was updated, but the recovery session could not be closed. Select Return to sign in to try again.');
      throw signOutError;
    }
    setAuthNotice({ kind: 'success', message: 'Your password has been updated. Sign in with your new password.' });
  };

  const deleteAccount = async () => {
    setError(null);
    if (!session || !user || !hasRecentPasswordSignIn(session.access_token, user.id)) {
      const err = new Error('Sign out and sign in again, then retry account deletion within five minutes.');
      setError(err.message);
      throw err;
    }
    const { error: err } = await getSupabase().functions.invoke('delete-account', { body: { confirmation: 'DELETE' } });
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
        authNotice,
        isPasswordRecovery,
        recoverySessionReady,
        updatePassword,
        exitPasswordRecovery,
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
