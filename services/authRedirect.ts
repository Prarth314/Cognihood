export interface AuthRedirectNotice {
  kind: 'success' | 'error';
  message: string;
}

export function getSignupRedirectUrl(origin: string): string {
  return new URL('/?auth=confirm', origin).href;
}

/** Inspect the provider callback without creating or storing a login session. */
export function getEmailConfirmationNotice(url: URL): AuthRedirectNotice | null {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const type = fragment.get('type');
  // Password recovery must continue through its own session flow.
  if (type === 'recovery') return null;

  const errorCode = fragment.get('error_code') ?? url.searchParams.get('error_code');
  if (errorCode || fragment.has('error') || url.searchParams.has('error')) {
    return {
      kind: 'error',
      message: errorCode === 'otp_expired'
        ? 'This confirmation link has expired or has already been used. Try signing in if you already confirmed your email, or request a new confirmation email below.'
        : 'Your email could not be confirmed. Request a new confirmation email below and open the latest link.',
    };
  }

  if ((type === 'signup' || type === 'email') && fragment.get('access_token') && fragment.get('refresh_token')) {
    return { kind: 'success', message: 'Your email is confirmed. Sign in with your email and password to continue.' };
  }

  if (type === 'signup' || type === 'email' || url.searchParams.get('auth') === 'confirm') {
    return { kind: 'error', message: 'This confirmation link is incomplete. Try signing in if your email is already confirmed, or request a new confirmation email below.' };
  }
  return null;
}

/** Remove confirmation credentials before analytics or Supabase initializes. */
export function consumeEmailConfirmationRedirect(browser: Pick<Window, 'location' | 'history'>): AuthRedirectNotice | null {
  const url = new URL(browser.location.href);
  const notice = getEmailConfirmationNotice(url);
  if (!notice) return null;
  // No callback tokens, provider error text, or email address survive in the URL.
  browser.history.replaceState(null, '', '/');
  return notice;
}
