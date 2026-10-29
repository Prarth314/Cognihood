import { describe, it, expect } from 'vitest';
import { validatePublicEnvironment } from '../scripts/public-env.mjs';
describe('public build environment', () => {
  it('allows public configuration and ignores server-only environment names', () => {
    expect(() =>
      validatePublicEnvironment({ VITE_SUPABASE_ANON_KEY: 'sb_publishable_example', GEMINI_API_KEY: 'server-example' }),
    ).not.toThrow();
  });
  it('rejects privileged browser keys without echoing their values', () => {
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.fixture`;
    expect(() => validatePublicEnvironment({ VITE_SUPABASE_ANON_KEY: token })).toThrow('Privileged');
    expect(() => validatePublicEnvironment({ VITE_GEMINI_API_KEY: 'fixture' })).toThrow('Server-only');
    expect(() => validatePublicEnvironment({ VITE_SUPABASE_ANON_KEY: 'sb_secret_fixture' })).toThrow(
      'Private credential',
    );
  });
});
