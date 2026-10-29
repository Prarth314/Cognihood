import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetricsBuffer } from './metricsBuffer';
const mocks = vi.hoisted(() => ({ create: vi.fn(), detect: vi.fn(), resolve: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: { createFromOptions: mocks.create },
  FilesetResolver: { forVisionTasks: mocks.resolve },
}));
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  mocks.resolve.mockResolvedValue({});
  mocks.create.mockReset().mockResolvedValue({ detectForVideo: mocks.detect });
});
afterEach(() => vi.useRealTimers());
describe('camera signal correctness and recovery', () => {
  it('falls back to CPU when GPU initialization fails', async () => {
    mocks.create.mockRejectedValueOnce(new Error('No GPU'));
    const module = await import('./faceLandmarker');
    expect(await module.initFaceLandmarker()).toBe(true);
    expect(mocks.create.mock.calls[1][1].baseOptions.delegate).toBe('CPU');
  });
  it('allows retry after model initialization fails', async () => {
    mocks.create.mockRejectedValueOnce(new Error('GPU failed')).mockRejectedValueOnce(new Error('CPU failed'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const module = await import('./faceLandmarker');
    expect(await module.initFaceLandmarker()).toBe(false);
    expect(await module.initFaceLandmarker()).toBe(true);
    quiet.mockRestore();
  });
  it('uses wall-clock sample times and counts a completed blink only once', async () => {
    const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
    for (const indices of [
      [33, 160, 158, 133, 153, 144],
      [362, 385, 387, 263, 373, 380],
    ]) {
      const coordinates = [
        [0, 0],
        [1, 1],
        [2, 1],
        [3, 0],
        [2, -1],
        [1, -1],
      ];
      indices.forEach((index, i) => {
        points[index] = { x: coordinates[i][0], y: coordinates[i][1] };
      });
    }
    const result = (score: number) => ({
      faceLandmarks: [points],
      faceBlendshapes: [
        {
          categories: [
            { categoryName: 'eyeBlinkLeft', score },
            { categoryName: 'eyeBlinkRight', score },
          ],
        },
      ],
    });
    mocks.detect.mockReturnValueOnce(result(0.9)).mockReturnValueOnce(result(0.1)).mockReturnValue(result(0.1));
    const module = await import('./faceLandmarker');
    await module.initFaceLandmarker();
    const video = { readyState: 2 } as HTMLVideoElement;
    const first = module.detectFaceFromVideo(video, 100);
    const second = module.detectFaceFromVideo(video, 200);
    const third = module.detectFaceFromVideo(video, 300);
    expect([first.blinkDetected, second.blinkDetected, third.blinkDetected]).toEqual([false, true, false]);
    const buffer = new MetricsBuffer();
    buffer.add(second);
    expect(buffer.getInWindow(30000)).toHaveLength(1);
    expect(second.timestamp).toBe(Date.now());
  });
});
