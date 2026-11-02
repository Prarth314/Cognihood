import { afterEach, expect, it, vi } from 'vitest';
import { analyzeDrivingEnvironment } from './geminiService';
import { computeTemporalAnalysis } from './temporalAnalysis';
import type { LocalFaceSnapshot } from '../types';
const fixture = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('./supabaseClient', () => ({ getSupabase: () => ({ functions: { invoke: fixture.invoke } }) }));
afterEach(() => { vi.useRealTimers(); fixture.invoke.mockReset(); });
it('requires a recorded consent receipt before invoking a provider function', async () => {
  await expect(analyzeDrivingEnvironment('fixture', [])).rejects.toThrow('recorded consent');
  expect(fixture.invoke).not.toHaveBeenCalled();
});
it('propagates caller cancellation to the in-flight SDK request', async () => {
  fixture.invoke.mockImplementation((_name, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('fixture-aborted')), { once: true });
  }));
  const controller = new AbortController();
  const pending = analyzeDrivingEnvironment('fixture', [], null, null, controller.signal, 'fixture-receipt');
  const rejected = expect(pending).rejects.toThrow('fixture-aborted'); controller.abort(); await rejected;
  expect(fixture.invoke.mock.calls[0][1].signal.aborted).toBe(true);
});
it('keeps deterministic numeric state local even when mocked provider values disagree', async () => {
  vi.useFakeTimers(); vi.setSystemTime(10000);
  const frame = (timestamp: number): LocalFaceSnapshot => ({ timestamp, faceDetected: true, eyesClosed: false, blinkDetected: false, ear: .3, headPose: { pitch: 0, yaw: 0, roll: 0 } });
  const temporal = computeTemporalAnalysis(Array.from({ length: 20 }, (_, index) => frame(8100 + index * 100)));
  fixture.invoke.mockResolvedValue({ error: null, data: { metrics: { ear: 0, blinkRate: 0, closureDuration: 60, headPose: { pitch: 90, yaw: 90, roll: 90 }, distractionLevel: 100 }, cognitiveLoad: 100, explanation: 'Unvalidated fixture commentary' } });
  const result = await analyzeDrivingEnvironment('fixture', [], temporal, frame(10000), undefined, 'fixture-receipt');
  expect(result.score).toBe(100); expect(result.metrics.ear).toBe(.3); expect(result.metrics.cognitiveLoad).toBe(0);
  fixture.invoke.mockResolvedValue({ error: null, data: { invalid: 'fixture' } });
  await expect(analyzeDrivingEnvironment('fixture', [], temporal, frame(10000), undefined, 'fixture-receipt')).rejects.toThrow('omitted metrics');
});
