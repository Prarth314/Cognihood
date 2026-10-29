import { describe, expect, it, vi } from 'vitest';
import { consumeEmailConfirmationRedirect, getEmailConfirmationNotice, getSignupRedirectUrl, getPasswordRecoveryRedirectUrl, isPasswordRecoveryUrl } from './authRedirect';

// Deliberately invalid fixtures, never real credentials.
const signupFragment = '#access_token=fixture&refresh_token=fixture&type=signup';

describe('email confirmation redirects', () => {
  it('sends production and local emails to the matching sign-in origin', () => {
    expect(getSignupRedirectUrl('https://cognihood.vercel.app')).toBe('https://cognihood.vercel.app/?auth=confirm');
    expect(getSignupRedirectUrl('http://localhost:3000')).toBe('http://localhost:3000/?auth=confirm');
  });

  it('recognizes verified signup callbacks including old home-page links', () => {
    expect(getEmailConfirmationNotice(new URL(`https://cognihood.vercel.app/${signupFragment}`))?.kind).toBe('success');
    expect(getEmailConfirmationNotice(new URL(`https://cognihood.vercel.app/?auth=confirm${signupFragment}`))?.message).toContain('Sign in');
  });

  it('removes callback credentials and untrusted redirect values from browser history', () => {
    const replaceState = vi.fn();
    const browser = {
      location: { href: `https://cognihood.vercel.app/?auth=confirm&next=https://untrusted.example${signupFragment}` },
      history: { replaceState },
    } as unknown as Pick<Window, 'location' | 'history'>;
    expect(consumeEmailConfirmationRedirect(browser)?.kind).toBe('success');
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, '', '/');
  });

  it('does not claim that an incomplete or manually opened callback confirmed an email', () => {
    expect(getEmailConfirmationNotice(new URL('https://cognihood.vercel.app/?auth=confirm'))?.kind).toBe('error');
    expect(getEmailConfirmationNotice(new URL('https://cognihood.vercel.app/?auth=confirm#type=signup&access_token=fixture'))?.kind).toBe('error');
    expect(getEmailConfirmationNotice(new URL('https://cognihood.vercel.app/#type=signup'))?.kind).toBe('error');
  });

  it('gives expired links a useful next step without displaying provider error text', () => {
    const notice = getEmailConfirmationNotice(new URL('https://cognihood.vercel.app/#error=access_denied&error_code=otp_expired&error_description=untrusted'));
    expect(notice?.kind).toBe('error');
    expect(notice?.message).toContain('already been used');
    expect(notice?.message).not.toContain('untrusted');
  });

  it('handles errors returned in query parameters', () => {
    expect(getEmailConfirmationNotice(new URL('https://cognihood.vercel.app/?error=access_denied'))?.kind).toBe('error');
  });

  it('leaves ordinary visits and password-recovery callbacks alone', () => {
    expect(getEmailConfirmationNotice(new URL('https://cognihood.vercel.app/'))).toBeNull();
    const replaceState = vi.fn();
    const browser = {
      location: { href: 'https://cognihood.vercel.app/#access_token=fixture&refresh_token=fixture&type=recovery' },
      history: { replaceState },
    } as unknown as Pick<Window, 'location' | 'history'>;
    expect(consumeEmailConfirmationRedirect(browser)).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('password recovery redirects', () => {
  it('uses a recovery-specific redirect on the same website', () => {
    expect(getPasswordRecoveryRedirectUrl('https://cognihood.vercel.app')).toBe('https://cognihood.vercel.app/?auth=recovery');
    expect(getPasswordRecoveryRedirectUrl('http://localhost:3000')).toBe('http://localhost:3000/?auth=recovery');
  });

  it('recognizes old callback fragments and the marker retained on refresh', () => {
    expect(isPasswordRecoveryUrl(new URL('https://cognihood.vercel.app/#type=recovery&access_token=fixture'))).toBe(true);
    expect(isPasswordRecoveryUrl(new URL('https://cognihood.vercel.app/?auth=recovery'))).toBe(true);
    expect(isPasswordRecoveryUrl(new URL('https://cognihood.vercel.app/?auth=confirm'))).toBe(false);
  });

  it('does not mistake expired password-reset links for signup confirmations', () => {
    const url = new URL('https://cognihood.vercel.app/?auth=recovery#error=access_denied&error_code=otp_expired');
    expect(isPasswordRecoveryUrl(url)).toBe(true);
    expect(getEmailConfirmationNotice(url)).toBeNull();
  });
});
