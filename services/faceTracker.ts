import type { LocalFaceSnapshot } from '../types';
import type { FaceWorkerRequest, FaceWorkerReply } from './faceWorker';

export interface FaceTracker {
  mode: 'worker' | 'main';
  analyze(video: HTMLVideoElement, timestampMs: number): Promise<LocalFaceSnapshot | null>;
  close(): void;
  diagnostics(): { attempts: number; completed: number; busyDrops: number; staleDrops: number; errors: number };
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
  const stats = { attempts: 0, completed: 0, busyDrops: 0, staleDrops: 0, errors: 0 };
  return { mode: 'main', analyze: async (video, time) => {
    stats.attempts++; if (disposed) return null;
    const capturedAt = Date.now();
    const snapshot = module.detectFaceFromVideo(video, time);
    if (Date.now() - capturedAt > 500 || Date.now() < capturedAt) { stats.staleDrops++; return null; }
    stats.completed++; return { ...snapshot, timestamp: capturedAt };
  }, diagnostics: () => ({ ...stats }), close: () => { disposed = true; } };
}

type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>;
export class WorkerFaceTracker implements FaceTracker {
  readonly mode = 'worker' as const;
  private sequence = 0;
  private closed = false;
  private busy = false;
  private lastTimestamp = -Infinity;
  private stats = { attempts: 0, completed: 0, busyDrops: 0, staleDrops: 0, errors: 0 };
  private cancelCapture: (() => void) | undefined;
  diagnostics() { return { ...this.stats }; }
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
    this.stats.attempts++;
    if (this.busy) { this.stats.busyDrops++; return null; }
    if (this.closed || !Number.isFinite(timestampMs) || timestampMs <= this.lastTimestamp) return null;
    this.lastTimestamp = timestampMs;
    this.busy = true;
    const capturedAt = Date.now();
    let frame: ImageBitmap | undefined;
    let captureTimer: ReturnType<typeof setTimeout> | undefined;
    let abandoned = false;
    try {
      frame = await new Promise<ImageBitmap>((resolve, reject) => {
        this.cancelCapture = () => { abandoned = true; reject(new Error('Face capture cancelled.')); };
        captureTimer = setTimeout(() => { abandoned = true; reject(new Error('Frame capture timed out.')); }, 5000);
        this.bitmap(video).then(bitmap => { if (abandoned || this.closed) { bitmap.close(); reject(new Error('Face capture cancelled.')); } else resolve(bitmap); }, reject);
      });
      clearTimeout(captureTimer); this.cancelCapture = undefined;
      if (this.closed) { frame.close(); return null; }
      const reply = await this.request({ kind: 'frame', id: ++this.sequence, bitmap: frame, timestampMs, capturedAt }, [frame]);
      if (this.closed || Date.now() - capturedAt > 500 || Date.now() < capturedAt) { this.stats.staleDrops++; return null; }
      this.stats.completed++; return reply.snapshot ?? null;
    } catch (error) { this.stats.errors++; frame?.close(); if (this.closed) return null; throw error; }
    finally { clearTimeout(captureTimer); this.cancelCapture = undefined; this.busy = false; }
  }
  close() { if (this.closed) return; this.closed = true; this.cancelCapture?.(); this.worker.onmessage = null; this.worker.onerror = null; this.worker.terminate(); this.fail(new Error('Face tracker is closed.')); }
}
