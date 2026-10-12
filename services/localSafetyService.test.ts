import { describe, expect, it } from 'vitest';
import { createLocalSafetyAssessment } from './localSafetyService';
import { SafetyState, TemporalAnalysis } from '../types';

const temporal = (overrides: Partial<TemporalAnalysis> = {}): TemporalAnalysis => ({
  perclos30: 2,
  perclos60: 2,
  blinkRatePerMin: 12,
  gazeStagnation: 10,
  headPoseVariance: 5,
  highwayHypnosisIndex: 10,
  monotonyDurationSec: 0,
  sampleCount: 60,
  faceDetectionRate: 100,
  ...overrides,
});

const snapshot = {
  timestamp: Date.now(),
  ear: 0.3,
  eyesClosed: false,
  blinkDetected: false,
  headPose: { pitch: 0, yaw: 0, roll: 0 },
  faceDetected: true,
};

describe('createLocalSafetyAssessment', () => {
  it('returns safe for a stable local baseline', () => {
    const result = createLocalSafetyAssessment(temporal(), snapshot);
    expect(result.state).toBe(SafetyState.SAFE);
    expect(result.analysisSource).toBe('LOCAL');
    expect(result.score).toBeGreaterThan(70);
  });

  it('fails closed for critical PERCLOS', () => {
    const result = createLocalSafetyAssessment(temporal({ perclos30: 30 }), {
      ...snapshot,
      eyesClosed: true,
      ear: 0.12,
    });
    expect(result.state).toBe(SafetyState.CRITICAL);
  });

  it('warns when the driver face is unavailable', () => {
    const result = createLocalSafetyAssessment(temporal({ faceDetectionRate: 20 }), {
      ...snapshot,
      faceDetected: false,
    });
    expect(result.state).not.toBe(SafetyState.SAFE);
  });
});
