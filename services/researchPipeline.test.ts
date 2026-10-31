import { afterEach, expect, it, vi } from 'vitest';
import { computeTemporalAnalysis } from './temporalAnalysis';
import { applyCloudCommentary } from './cloudCommentary';
import { MetricsBuffer } from './metricsBuffer';
import { EligibilityEngine } from './eligibilityEngine';
import type { LocalFaceSnapshot, SafetyAssessment } from '../types';
const frame = (timestamp: number, extra: Partial<LocalFaceSnapshot> = {}): LocalFaceSnapshot => ({ timestamp, faceDetected: true, ear: .3, eyesClosed: false, blinkDetected: false, headPose: { yaw: 0, pitch: 0, roll: 0 }, ...extra });
afterEach(() => vi.useRealTimers());
it('normalizes blink rate to observed valid time, not the missing-face interval', () => {
  const rows = Array.from({ length: 101 }, (_, i) => frame(i * 100, { faceDetected: i <= 20 || i >= 80, blinkDetected: i === 10 || i === 90 }));
  const result = computeTemporalAnalysis(rows, undefined, 10000);
  expect(result.observedMs30).toBe(4000); expect(result.blinkRatePerMin).toBe(30); expect(result.faceDetectionRate).toBe(40);
});
it('excludes long gaps consistently and withdraws immediately on a missing latest face', () => {
  expect(computeTemporalAnalysis([frame(0), frame(1000)], undefined, 1000).faceDetectionRate).toBe(0);
  const rows = Array.from({ length: 100 }, (_, i) => frame(i * 100)); rows.push(frame(10000, { faceDetected: false }));
  expect(computeTemporalAnalysis(rows, undefined, 10000).faceDetectionRate).toBe(0);
  expect(computeTemporalAnalysis(rows, undefined, 10000).sampleCount).toBe(100);
});
it('bounds live buffers and rejects future, duplicate and out-of-order arrivals', () => {
  vi.useFakeTimers(); vi.setSystemTime(100000);
  const buffer = new MetricsBuffer();
  for (let index = 0; index < 5000; index++) buffer.add(frame(90000 + index));
  buffer.add(frame(94000)); buffer.add(frame(200000)); buffer.add(frame(NaN));
  expect(buffer.getInWindow(120000)).toHaveLength(2400); expect(buffer.getLatest()?.timestamp).toBe(94999);
});
it('does not accept cloud commentary after local evidence disappears or carry captured numeric values forward', () => {
  vi.useFakeTimers(); vi.setSystemTime(10000);
  const fresh = frame(10000); const temporal = computeTemporalAnalysis(Array.from({ length: 20 }, (_, i) => frame(8100 + i * 100)));
  const eligibility = new EligibilityEngine().evaluate(temporal);
  const remote = { score: 1, explanation: 'Commentary only', metrics: { ear: 999 } } as unknown as SafetyAssessment;
  const merged = applyCloudCommentary(remote, temporal, fresh, eligibility)!;
  expect(merged.score).toBe(100); expect(merged.metrics.ear).toBe(.3); expect(merged.cloudCommentary).toBe('Commentary only');
  expect(applyCloudCommentary(remote, temporal, { ...fresh, faceDetected: false }, eligibility)).toBeNull();
  vi.advanceTimersByTime(501); expect(applyCloudCommentary(remote, temporal, fresh, eligibility)).toBeNull();
});
