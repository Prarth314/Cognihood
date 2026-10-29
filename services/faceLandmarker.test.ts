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
  it('requires bilateral evidence rather than classifying a wink as both eyes closed', async () => {
    const { bilateralClosure } = await import('./faceLandmarker');
    expect(bilateralClosure(.05,.3,.9,0,.15,.15)).toBe(false);
    expect(bilateralClosure(.3,.05,0,.9,.15,.15)).toBe(false);
    expect(bilateralClosure(.1,.1,0,0,.15,.15)).toBe(true);
    expect(bilateralClosure(.3,.3,.9,.9,.15,.15)).toBe(true);
  });
  it('keeps EAR invariant to translation, scaling and in-plane rotation in pixel space', async () => {
    const { eyeAspectRatio } = await import('./faceLandmarker');
    const eye = [{x:0,y:0},{x:1,y:.3},{x:2,y:.3},{x:3,y:0},{x:2,y:-.3},{x:1,y:-.3}];
    for (const aspect of [1, 4/3, 16/9]) for (const scale of [.02, .1, .3]) for (const angle of [-.5, 0, .5]) {
      const points = eye.map(p => ({ x: (.5 + scale * (p.x * Math.cos(angle) - p.y * Math.sin(angle))) / aspect, y: .5 + scale * (p.x * Math.sin(angle) + p.y * Math.cos(angle)) }));
      expect(eyeAspectRatio(points, [0,1,2,3,4,5], aspect)).toBeCloseTo(.2);
    }
    expect(eyeAspectRatio(Array.from({length:6}, () => ({x:0,y:0})), [0,1,2,3,4,5])).toBeNaN();
  });
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
