import { describe, expect, it } from 'vitest';
import { hasRecentPasswordSignIn } from '../supabase/functions/_shared/recentAuthentication';

describe('destructive action freshness', () => {
  const now = 1_800_000_000_000;
  const token = (amr: unknown, sub = 'fixture-user') =>
    `fixture.${btoa(JSON.stringify({ sub, iat: now / 1000, amr }))}.fixture`;
  it('requires recent password authentication for the same verified user', () => {
    expect(
      hasRecentPasswordSignIn(token([{ method: 'password', timestamp: now / 1000 - 60 }]), 'fixture-user', now),
    ).toBe(true);
    expect(
      hasRecentPasswordSignIn(
        token([{ method: 'password', timestamp: now / 1000 - 60 }], 'other-user'),
        'fixture-user',
        now,
      ),
    ).toBe(false);
  });
  it('rejects refreshed old sessions, recovery methods, malformed and future claims', () => {
    for (const amr of [
      null,
      [],
      [{ method: 'password', timestamp: now / 1000 - 3600 }],
      [{ method: 'recovery', timestamp: now / 1000 }],
      [{ method: 'password', timestamp: now / 1000 + 3600 }],
    ]) {
      expect(hasRecentPasswordSignIn(token(amr), 'fixture-user', now)).toBe(false);
    }
    expect(hasRecentPasswordSignIn('invalid', 'fixture-user', now)).toBe(false);
  });
});
