import { initFaceLandmarker, resetFaceTrackingState, detectFaceFromBitmap } from './faceLandmarker';
import type { LocalFaceSnapshot } from '../types';

export type FaceWorkerRequest = { id: number; kind: 'init' } | {
  id: number; kind: 'frame'; bitmap: ImageBitmap; timestampMs: number; capturedAt: number;
};
export type FaceWorkerReply = { id: number; ready?: boolean; snapshot?: LocalFaceSnapshot; error?: string };
const scope = self as unknown as {
  onmessage: (event: MessageEvent<FaceWorkerRequest>) => void;
  postMessage: (reply: FaceWorkerReply) => void;
};
scope.onmessage = async ({ data }) => {
  if (data.kind === 'init') {
    try {
      const ready = await initFaceLandmarker();
      if (ready) resetFaceTrackingState();
      scope.postMessage({ id: data.id, ready });
    } catch { scope.postMessage({ id: data.id, error: 'Model initialization failed.' }); }
    return;
  }
  try {
    const snapshot = detectFaceFromBitmap(data.bitmap, data.timestampMs);
    // Keep capture time rather than inference-completion time in temporal windows.
    scope.postMessage({ id: data.id, snapshot: { ...snapshot, timestamp: data.capturedAt } });
  } catch { scope.postMessage({ id: data.id, error: 'Frame analysis failed.' }); }
  finally { data.bitmap.close(); }
};
