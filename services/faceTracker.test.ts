import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerFaceTracker } from './faceTracker';
const fakeWorker = () => ({ postMessage: vi.fn(), terminate: vi.fn(), onmessage: null as Worker['onmessage'], onerror: null as Worker['onerror'] });
const video = {} as HTMLVideoElement;
afterEach(() => vi.useRealTimers());
describe('worker frame lifecycle', () => {
  it('transfers only one frame at a time instead of building an inference queue', async () => {
    const worker = fakeWorker(); const close = vi.fn();
    const bitmap = vi.fn(async () => ({ close } as unknown as ImageBitmap));
    const tracker = new WorkerFaceTracker(worker, bitmap);
    const frame = tracker.analyze(video, 10);
    expect(await tracker.analyze(video, 20)).toBeNull();
    await Promise.resolve();
    const id = worker.postMessage.mock.calls[0][0].id;
    worker.onmessage!.call(worker as unknown as Worker, { data: { id, snapshot: { faceDetected: true } } } as MessageEvent);
    expect(await frame).toEqual({ faceDetected: true });
    expect(bitmap).toHaveBeenCalledOnce(); tracker.close();
  });
  it('closes a bitmap captured after disposal without sending it to the worker', async () => {
    const worker = fakeWorker(); const close = vi.fn();
    let finish: (bitmap: ImageBitmap) => void;
    const tracker = new WorkerFaceTracker(worker, () => new Promise(resolve => { finish = resolve; }));
    const frame = tracker.analyze(video, 10); tracker.close();
    finish!({ close } as unknown as ImageBitmap);
    expect(await frame).toBeNull(); expect(close).toHaveBeenCalledOnce();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });
  it('bounds stalled inference and releases pending work when closed', async () => {
    vi.useFakeTimers();
    const worker = fakeWorker();
    const tracker = new WorkerFaceTracker(worker, async () => ({ close: vi.fn() } as unknown as ImageBitmap));
    const init = tracker.initialize();
    const rejection = expect(init).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(30001); await rejection;
    const second = tracker.initialize(); const closed = expect(second).rejects.toThrow('closed');
    tracker.close(); await closed; expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
