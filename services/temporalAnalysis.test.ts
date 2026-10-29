import { describe, expect, it, vi } from 'vitest';
import { computeTemporalAnalysis } from './temporalAnalysis';
import { LocalFaceSnapshot } from '../types';

function snapshot(overrides: Partial<LocalFaceSnapshot> = {}): LocalFaceSnapshot {
  return {
    timestamp: Date.now(),
    ear: 0.3,
    eyesClosed: false,
    blinkDetected: false,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    faceDetected: true,
    ...overrides,
  };
}

describe('computeTemporalAnalysis', () => {
  it('excludes missing-face frames from PERCLOS', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const result = computeTemporalAnalysis([
      snapshot(),
      snapshot({ faceDetected: false, eyesClosed: true, ear: 0 }),
    ]);
    expect(result.perclos30).toBe(0);
    expect(result.faceDetectionRate).toBe(0);
    vi.useRealTimers();
  });

  it('measures yaw and pitch variance independently', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const result = computeTemporalAnalysis([
      snapshot({ headPose: { yaw: 10, pitch: -10, roll: 0 } }),
      snapshot({ timestamp: Date.now() - 100, headPose: { yaw: -10, pitch: 10, roll: 0 } }),
    ]);
    expect(result.headPoseVariance).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
