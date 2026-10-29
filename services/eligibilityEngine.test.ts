import { afterEach, describe, expect, it, vi } from 'vitest';
import { EligibilityEngine } from './eligibilityEngine';
import { computeTemporalAnalysis } from './temporalAnalysis';
import { EligibilityState } from '../types';

afterEach(() => vi.useRealTimers());

describe('camera confidence boundary', () => {
  it('never upgrades empty camera data after the eligibility hold period', () => {
    vi.useFakeTimers();
    const engine = new EligibilityEngine();
    engine.evaluate(computeTemporalAnalysis([]));
    vi.advanceTimersByTime(60_000);
    expect(engine.evaluate(computeTemporalAnalysis([]))).toMatchObject({
      state: EligibilityState.MONITORING,
      canDrive: false,
      confidence: 0,
    });
  });
  it('withdraws an eligible indicator immediately when detection coverage is lost', () => {
    vi.useFakeTimers();
    const engine = new EligibilityEngine();
    const valid = { ...computeTemporalAnalysis([]), sampleCount: 100, faceDetectionRate: 100, highwayHypnosisIndex: 0 };
    engine.evaluate(valid);
    vi.advanceTimersByTime(8001);
    expect(engine.evaluate(valid).state).toBe(EligibilityState.ELIGIBLE);
    expect(engine.evaluate({ ...valid, faceDetectionRate: 0 })).toMatchObject({
      state: EligibilityState.MONITORING,
      canDrive: false,
    });
  });
});
