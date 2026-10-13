import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutonomyLevel, SafetyAssessment, SafetyState } from '../types';
import { TripSession } from './tripSession';

const assessment: SafetyAssessment = {
  score: 90,
  state: SafetyState.SAFE,
  autonomyLevel: AutonomyLevel.INFORM,
  explanation: 'Local development indicator.',
  metrics: {
    ear: 0.3,
    blinkRate: 12,
    closureDuration: 0,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    stressLevel: 0,
    distractionLevel: 5,
    cognitiveLoad: 10,
  },
  timestamp: 0,
};

afterEach(() => vi.useRealTimers());

describe('TripSession', () => {
  it('discards sessions without minimum duration and samples', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const session = new TripSession('00000000-0000-4000-8000-000000000000');
    expect(session.finalize(null)).toBeNull();
  });

  it('records provenance and does not invent distance', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const session = new TripSession('00000000-0000-4000-8000-000000000000', true);
    session.recordAssessment(assessment, null);
    vi.advanceTimersByTime(3_100);
    session.recordAssessment(assessment, null);
    vi.advanceTimersByTime(3_100);
    session.recordAssessment(assessment, null);
    vi.advanceTimersByTime(24_000);
    const trip = session.finalize(null);
    expect(trip).not.toBeNull();
    expect(trip?.distanceMi).toBe(0);
    expect(trip?.algorithmVersion).toBe('2026.10.13');
    expect(trip?.cloudAnalysisUsed).toBe(true);
    expect(trip?.cloudConsentAt).not.toBeNull();
  });
});
