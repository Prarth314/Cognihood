import type { LocalFaceSnapshot } from '../types';
import type { FaceWorkerRequest, FaceWorkerReply } from './faceWorker';

export interface FaceTracker {
  mode: 'worker' | 'main';
  analyze(video: HTMLVideoElement, timestampMs: number): Promise<LocalFaceSnapshot | null>;
  close(): void;
}

export async function createFaceTracker(): Promise<FaceTracker> {
  if (typeof Worker !== 'undefined' && typeof createImageBitmap !== 'undefined') {
    let worker: Worker | undefined;
    try {
      worker = new Worker(new URL('./faceWorker.ts', import.meta.url));
      const tracker = new WorkerFaceTracker(worker, createImageBitmap);
      await tracker.initialize();
      return tracker;
    } catch { worker?.terminate(); }
  }
  const module = await import('./faceLandmarker');
  if (!await module.initFaceLandmarker()) throw new Error('Face model unavailable.');
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
    if (this.closed || this.busy) return null;
    this.busy = true;
    const capturedAt = Date.now();
    let frame: ImageBitmap | undefined;
    try {
      frame = await this.bitmap(video);
      if (this.closed) { frame.close(); return null; }
      const reply = await this.request({ kind: 'frame', id: ++this.sequence, bitmap: frame, timestampMs, capturedAt }, [frame]);
      return this.closed ? null : reply.snapshot ?? null;
    } catch (error) { frame?.close(); throw error; }
    finally { this.busy = false; }
  }
  close() { this.closed = true; this.worker.terminate(); this.fail(new Error('Face tracker is closed.')); }
}
