import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeTemporalAnalysis } from './temporalAnalysis';
import { createLocalSafetyAssessment } from './localSafetyService';
import { EligibilityEngine } from './eligibilityEngine';
import { EligibilityState, LocalFaceSnapshot, SafetyState } from '../types';
const now = 1_800_000_000_000;
const sample = (offset: number, closed = false): LocalFaceSnapshot => ({
  timestamp: now + offset,
  faceDetected: true,
  eyesClosed: closed,
  blinkDetected: false,
  ear: closed ? 0.1 : 0.3,
  headPose: { yaw: 0, pitch: 0, roll: 0 },
});
afterEach(() => vi.useRealTimers());
describe('synthetic facial signal edge cases (not population accuracy validation)', () => {
  it('weights closure by time rather than camera frame count', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const result = computeTemporalAnalysis([
      sample(-1000),
      sample(-900, true),
      sample(-800, true),
      sample(-400, true),
      sample(0, true),
    ]);
    expect(result.perclos30).toBeCloseTo(90);
  });
  it('does not extrapolate closure across a stalled camera', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const result = computeTemporalAnalysis([sample(-30000, true), sample(-29000, true)]);
    expect(result.perclos30).toBe(0);
    expect(result.faceDetectionRate).toBe(0);
  });
  it('excludes a short closure run and reports actual sustained closure duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(computeTemporalAnalysis([sample(-300), sample(-200, true), sample(-100, true), sample(0)]).perclos30).toBe(
      0,
    );
    expect(
      computeTemporalAnalysis(Array.from({ length: 11 }, (_, i) => sample(-1000 + i * 100, true))).closureDurationSec,
    ).toBe(1);
  });
  it('handles reordered, duplicate, future and nonfinite frames deterministically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const clean = [sample(-200), sample(-100), sample(0)];
    expect(computeTemporalAnalysis([clean[2], clean[0], clean[1], clean[1], sample(100)])).toEqual(
      computeTemporalAnalysis(clean),
    );
    expect(computeTemporalAnalysis([...clean, { ...sample(-50), ear: NaN }]).faceDetectionRate).toBe(50);
  });
  it('does not interpret steady forward-facing observation as impairment', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const frames = Array.from({ length: 300 }, (_, i) => sample(-29900 + i * 100));
    const temporal = computeTemporalAnalysis(frames);
    const engine = new EligibilityEngine();
    engine.evaluate(temporal);
    vi.advanceTimersByTime(8001);
    expect(engine.evaluate(temporal).state).toBe(EligibilityState.ELIGIBLE);
    expect(createLocalSafetyAssessment(temporal, sample(0)).state).toBe(SafetyState.SAFE);
  });
  it.each([0, 20, 69])('does not present %s%% face coverage as a safe observation', (coverage) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const temporal = { ...computeTemporalAnalysis([]), sampleCount: 100, faceDetectionRate: coverage };
    expect(new EligibilityEngine().evaluate(temporal).canDrive).toBe(false);
    expect(createLocalSafetyAssessment(temporal, sample(0)).state).toBe(SafetyState.WARNING);
  });
});
