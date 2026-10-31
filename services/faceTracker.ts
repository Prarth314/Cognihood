import type { LocalFaceSnapshot } from '../types';
import type { FaceWorkerRequest, FaceWorkerReply } from './faceWorker';

export interface FaceTracker {
  mode: 'worker' | 'main';
  analyze(video: HTMLVideoElement, timestampMs: number): Promise<LocalFaceSnapshot | null>;
  close(): void;
}

export async function createFaceTracker(options: { signal?: AbortSignal; forceMain?: boolean } = {}): Promise<FaceTracker> {
  const { signal } = options;
  signal?.throwIfAborted();
  if (!options.forceMain && typeof Worker !== 'undefined' && typeof createImageBitmap !== 'undefined') {
    let worker: Worker | undefined;
    let tracker: WorkerFaceTracker | undefined;
    const abort = () => tracker?.close();
    try {
      worker = new Worker(new URL('./faceWorker.ts', import.meta.url));
      // Browser bitmap creation requires the Window receiver; passing the native
      // function as a class property gives it the tracker as `this` instead.
      tracker = new WorkerFaceTracker(worker, source => globalThis.createImageBitmap(source));
      signal?.addEventListener('abort', abort, { once: true });
      await tracker.initialize();
      return tracker;
    } catch { tracker ? tracker.close() : worker?.terminate(); signal?.throwIfAborted(); }
    finally { signal?.removeEventListener('abort', abort); }
  }
  const module = await import('./faceLandmarker');
  signal?.throwIfAborted();
  if (!await module.initFaceLandmarker()) throw new Error('Face model unavailable.');
  signal?.throwIfAborted();
  module.resetFaceTrackingState();
  let disposed = false;
  return { mode: 'main', analyze: async (video, time) => disposed ? null : module.detectFaceFromVideo(video, time), close: () => { disposed = true; } };
}

type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>;
export class WorkerFaceTracker implements FaceTracker {
  readonly mode = 'worker' as const;
  private sequence = 0;
  private closed = false;
  private busy = false;
  private lastTimestamp = -Infinity;
  private pending = new Map<number, { resolve: (reply: FaceWorkerReply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  constructor(private worker: WorkerPort, private bitmap: (source: HTMLVideoElement) => Promise<ImageBitmap>) {
    worker.onmessage = event => {
      const reply = event.data as FaceWorkerReply;
      const request = this.pending.get(reply.id);
      if (!request) return;
      clearTimeout(request.timer); this.pending.delete(reply.id);
      reply.error ? request.reject(new Error(reply.error)) : request.resolve(reply);
    };
    worker.onerror = () => this.fail(new Error('Face worker stopped unexpectedly.'));
  }
  private fail(error: Error) {
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(error); }
    this.pending.clear();
  }
  private request(data: FaceWorkerRequest, transfer: Transferable[] = []) {
    if (this.closed) return Promise.reject(new Error('Face tracker is closed.'));
    return new Promise<FaceWorkerReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(data.id); reject(new Error('Face analysis timed out.'));
      }, data.kind === 'init' ? 30_000 : 5_000);
      this.pending.set(data.id, { resolve, reject, timer });
      try { this.worker.postMessage(data, transfer); }
      catch (error) { clearTimeout(timer); this.pending.delete(data.id); reject(error); }
    });
  }
  async initialize() {
    const reply = await this.request({ kind: 'init', id: ++this.sequence });
    if (!reply.ready) throw new Error('Face worker model unavailable.');
  }
  async analyze(video: HTMLVideoElement, timestampMs: number) {
    if (this.closed || this.busy || !Number.isFinite(timestampMs) || timestampMs <= this.lastTimestamp) return null;
    this.lastTimestamp = timestampMs;
    this.busy = true;
    const capturedAt = Date.now();
    let frame: ImageBitmap | undefined;
    try {
      frame = await this.bitmap(video);
      if (this.closed) { frame.close(); return null; }
      const reply = await this.request({ kind: 'frame', id: ++this.sequence, bitmap: frame, timestampMs, capturedAt }, [frame]);
      return this.closed || Date.now() - capturedAt > 500 || Date.now() < capturedAt ? null : reply.snapshot ?? null;
    } catch (error) { frame?.close(); throw error; }
    finally { this.busy = false; }
  }
  close() { if (this.closed) return; this.closed = true; this.worker.onmessage = null; this.worker.onerror = null; this.worker.terminate(); this.fail(new Error('Face tracker is closed.')); }
}
