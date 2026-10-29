import { describe, expect, it } from 'vitest';
import { validLegacyTrip } from './legacyMigration';
describe('legacy ownership boundary', () => {
  it('does not relabel another account’s trip as the current user', () => {
    const otherwiseValid = {
      id: '00000000-0000-4000-8000-000000000000',
      userId: 'other-account',
      startTime: 1,
      endTime: 30_001,
      durationMs: 30_000,
      avgScore: 80,
      minScore: 70,
      maxScore: 90,
      events: [],
      coachingTips: [],
      scoreTimeline: [],
    };
    expect(validLegacyTrip(otherwiseValid, 'current-account')).toBeNull();
    expect(validLegacyTrip(otherwiseValid, 'other-account')?.userId).toBe('other-account');
  });
});
