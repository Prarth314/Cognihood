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
  it('keeps fractional averages inside the stored min/max range', () => {
    vi.useFakeTimers();
    const session = new TripSession('00000000-0000-4000-8000-000000000000');
    for (let i = 0; i < 3; i++) {
      session.recordAssessment({ ...assessment, score: 90.4 }, null);
      vi.advanceTimersByTime(15_000);
    }
    const trip = session.finalize(null)!;
    expect(trip.avgScore).toBeGreaterThanOrEqual(trip.minScore);
    expect(trip.avgScore).toBeLessThanOrEqual(trip.maxScore);
    expect(trip.avgScore).toBeCloseTo(90.4);
  });
  it('bounds long-session charts/events without discarding lifetime score statistics', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const session = new TripSession('00000000-0000-4000-8000-000000000000');
    for (let i = 0; i < 6000; i++) {
      session.recordAssessment({ ...assessment, score: i % 2 ? 100 : 80 }, null);
      vi.advanceTimersByTime(3100);
    }
    for (let i = 0; i < 510; i++) session.recordHarshBrake(1);
    const trip = session.finalize(null);
    expect(trip?.scoreTimeline.length).toBeLessThanOrEqual(5000);
    expect(trip?.events.length).toBeLessThanOrEqual(500);
    expect(trip?.avgScore).toBe(90);
    expect(trip?.minScore).toBe(80);
    expect(trip?.maxScore).toBe(100);
  });
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
