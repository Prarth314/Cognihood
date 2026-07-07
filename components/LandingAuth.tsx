import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Skeleton from './ui/Skeleton';

interface LandingAuthProps {
  onAuthenticated: () => void;
}

const LandingAuth: React.FC<LandingAuthProps> = ({ onAuthenticated }) => {
  const {
    loading,
    supabaseReady,
    supabaseConnected,
    error,
    cogniId,
    user,
    signInAnonymously,
    signInWithEmail,
    signUpWithEmail,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'quick' | 'email'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) onAuthenticated();
  }, [user, onAuthenticated]);

  const handleQuickStart = async () => {
    setSubmitting(true);
    clearError();
    await signInAnonymously();
    setSubmitting(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    if (isSignUp) await signUpWithEmail(email, password);
    else await signInWithEmail(email, password);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6">
        <Skeleton width={48} height={48} className="rounded-xl" />
        <Skeleton width={200} height={16} />
        <p className="sr-only">Initializing CogniHood</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--primary)] text-white text-xl font-bold shadow-md">
            C
          </div>
          <h1 className="ui-display">CogniHood</h1>
          <p className="ui-body">Real-time driver safety intelligence with cognitive monitoring and trip insights.</p>
        </div>

        {!supabaseReady && (
          <Card muted className="border-[var(--warning)] bg-[var(--warning-muted)]">
            <p className="ui-body text-[#92400e]">
              Add <code className="mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="mono text-xs">VITE_SUPABASE_ANON_KEY</code> to{' '}
              <code className="mono text-xs">.env.local</code>
            </p>
          </Card>
        )}

        <Card>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="ui-h2">Sign in</h2>
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

            {mode === 'quick' ? (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleQuickStart}
                  disabled={!supabaseReady || submitting}
                >
                  {submitting ? 'Connecting…' : 'Quick start (anonymous)'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setMode('email')}>
                  Sign in with email
                </Button>
              </div>
            ) : (
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
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {isSignUp ? 'Create account' : 'Sign in'}
                </Button>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setMode('quick')}>
                    Back to quick start
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        <p className="ui-caption text-center">
          Biometric analysis runs locally. Trip data syncs securely to your account.
        </p>
      </div>
    </div>
  );
};

export default LandingAuth;
