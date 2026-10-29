import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Skeleton from './ui/Skeleton';
import PasswordRecoveryForm from './PasswordRecoveryForm';

interface LandingAuthProps {
  onAuthenticated: () => void;
}

const LandingAuth: React.FC<LandingAuthProps> = ({ onAuthenticated }) => {
  const {
    loading,
    supabaseReady,
    supabaseConnected,
    error,
    authNotice,
    isPasswordRecovery,
    cogniId,
    user,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendConfirmation,
    clearError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(authNotice?.message ?? null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(authNotice?.kind === 'error');

  React.useEffect(() => {
    if (user && !isPasswordRecovery) onAuthenticated();
  }, [user, isPasswordRecovery, onAuthenticated]);

  React.useEffect(() => {
    if (authNotice) setNotice(authNotice.message);
  }, [authNotice]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    setNotice(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setIsSignUp(false);
        setPassword('');
        setAwaitingConfirmation(true);
        setNotice('Check your email and select Confirm email. You will return to CogniHood to sign in with your email and password.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'email_not_confirmed') {
        setAwaitingConfirmation(true);
      }
      // AuthContext exposes the sanitized provider error in the form alert.
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice('Enter your email address above to request a new confirmation link.');
      return;
    }
    setSubmitting(true);
    clearError();
    try {
      await resendConfirmation(email);
      setNotice('If this address has an account awaiting confirmation, a new email has been sent. Open the latest link, then sign in here.');
    } catch {
      // AuthContext exposes provider rate-limit and delivery errors.
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setNotice('Enter your email address first.');
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await sendPasswordReset(email);
      setNotice('If the account exists, a password-reset email has been sent.');
    } catch {
      // AuthContext exposes the sanitized provider error in the form alert.
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-loading flex flex-col items-center justify-center gap-4 p-6" role="status">
        <Skeleton width={48} height={48} className="rounded-xl" />
        <Skeleton width={200} height={16} />
        <p className="sr-only">Initializing CogniHood</p>
      </div>
    );
  }

  if (isPasswordRecovery) return <PasswordRecoveryForm />;

  return (
    <div className="auth-panel flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="auth-form-heading space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--primary)] text-white text-xl font-bold shadow-md">
            C
          </div>
          <p className="eyebrow-new">Welcome to CogniHood</p>
          <h2 className="ui-display">{isSignUp ? 'Make space for insight.' : 'Good to see you.'}</h2>
          <p className="ui-body">{isSignUp ? 'Create your development account to explore the app.' : 'Sign in to your attention-support workspace.'}</p>
        </div>

        {!supabaseReady && (
          <Card muted className="border-[var(--warning)] bg-[var(--warning-muted)]">
            <p className="ui-body text-[#92400e]">
              Supabase is not configured for this deployment. Add{' '}
              <code className="mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="mono text-xs">VITE_SUPABASE_ANON_KEY</code> to the deployment environment,
              then redeploy.
            </p>
          </Card>
        )}

        <Card>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="ui-h2">{isSignUp ? 'Create account' : 'Sign in'}</h2>
              <Badge tone={supabaseConnected ? 'success' : supabaseReady ? 'error' : 'warning'}>
                {supabaseReady ? (supabaseConnected ? 'Connected' : 'Offline') : 'Not configured'}
              </Badge>
            </div>

            {cogniId && (
              <div className="p-3 rounded-lg bg-[var(--primary-muted)] border border-[var(--primary)]/20">
                <p className="ui-caption mono">CogniID: {cogniId}</p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/20" role="alert">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}
            {notice && (
              <div className="p-3 rounded-lg bg-[var(--primary-muted)] border border-[var(--primary)]/20" role="status">
                <p className="text-sm">{notice}</p>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  required
                  minLength={isSignUp ? 10 : 6}
                  placeholder={isSignUp ? 'At least 10 characters' : 'Your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                {isSignUp && (
                  <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={legalAccepted}
                      onChange={event => setLegalAccepted(event.target.checked)}
                      required
                    />
                    <span className="text-sm">
                      I confirm I am at least 18, agree to the{' '}
                      <a className="underline" href="/terms.html" target="_blank" rel="noreferrer">Terms of Use</a>,
                      and acknowledge the <a className="underline" href="/notice-at-collection.html" target="_blank" rel="noreferrer">Notice at Collection</a>,{' '}
                      <a className="underline" href="/privacy.html" target="_blank" rel="noreferrer">Privacy Notice</a>, and{' '}
                      <a className="underline" href="/safety.html" target="_blank" rel="noreferrer">Safety Notice</a>.
                    </span>
                  </label>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!supabaseReady || submitting || (isSignUp && !legalAccepted)}
                >
                  {isSignUp ? 'Create account' : 'Sign in'}
                </Button>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="ghost" disabled={submitting} onClick={() => {
                    setIsSignUp(!isSignUp);
                    setLegalAccepted(false);
                  }}>
                    {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                  </Button>
                  {!isSignUp && (
                    <Button type="button" variant="ghost" onClick={handlePasswordReset} disabled={submitting}>
                      Forgot password?
                    </Button>
                  )}
                  {!isSignUp && awaitingConfirmation && (
                    <Button type="button" variant="ghost" onClick={handleResendConfirmation} disabled={!supabaseReady || submitting}>
                      Resend confirmation email
                    </Button>
                  )}
                </div>
              </form>
          </div>
        </Card>

        <div className="ui-caption text-center space-y-2">
          <p>Camera-derived attention analysis is local by default. Optional cloud enhancement requires explicit consent before each trip.</p>
          <p>This development build is not a medical device, emergency service, or fitness-to-drive determination.</p>
          <p><a className="underline" href="/legal.html" target="_blank" rel="noreferrer">Legal center</a> · <a className="underline" href="/privacy.html" target="_blank" rel="noreferrer">Privacy</a> · <a className="underline" href="/terms.html" target="_blank" rel="noreferrer">Terms</a> · <a className="underline" href="/safety.html" target="_blank" rel="noreferrer">Safety</a></p>
        </div>
      </div>
    </div>
  );
};

export default LandingAuth;
