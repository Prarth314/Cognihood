
import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { LocalFaceSnapshot } from '../types';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_CLOSED_THRESHOLD = 0.18;
const BLINK_BLEND_THRESHOLD = 0.45;

let landmarker: FaceLandmarker | null = null;
let initPromise: Promise<boolean> | null = null;
let lastEar = 0.3;
let wasClosed = false;
let calibratedEarThreshold = EAR_CLOSED_THRESHOLD;
let openEarSamples: number[] = [];

export function resetFaceTrackingState(): void {
  lastEar = 0.3;
  wasClosed = false;
  calibratedEarThreshold = EAR_CLOSED_THRESHOLD;
  openEarSamples = [];
}

function dist(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(landmarks: { x: number; y: number; z?: number }[], indices: number[]): number {
  const p = indices.map(i => landmarks[i]);
  const vertical = dist(p[1], p[5]) + dist(p[2], p[4]);
  const horizontal = dist(p[0], p[3]) * 2;
  return horizontal > 0 ? vertical / horizontal : 0;
}

function matrixToEuler(m: number[]): { pitch: number; yaw: number; roll: number } {
  const pitch = Math.asin(Math.max(-1, Math.min(1, -m[9])));
  const yaw = Math.atan2(m[8], m[10]);
  const roll = Math.atan2(m[4], m[0]);
  const toDeg = 180 / Math.PI;
  return { pitch: pitch * toDeg, yaw: yaw * toDeg, roll: roll * toDeg };
}

function getBlinkScore(result: FaceLandmarkerResult): number {
  const blends = result.faceBlendshapes?.[0]?.categories;
  if (!blends) return 0;
  const left = blends.find(b => b.categoryName === 'eyeBlinkLeft')?.score ?? 0;
  const right = blends.find(b => b.categoryName === 'eyeBlinkRight')?.score ?? 0;
  return (left + right) / 2;
}

export async function initFaceLandmarker(): Promise<boolean> {
  if (landmarker) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      const options = {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU' as const,
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO' as const,
        numFaces: 1,
      };
      try {
        landmarker = await FaceLandmarker.createFromOptions(vision, options);
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } });
      }
      return true;
    } catch (err) {
      console.error('FaceLandmarker init failed', err);
      return false;
    }
  })();

  const ready = await initPromise;
  if (!ready) initPromise = null;
  return ready;
}

export function isFaceLandmarkerReady(): boolean {
  return landmarker !== null;
}

export function detectFaceFromVideo(video: HTMLVideoElement, timestampMs: number): LocalFaceSnapshot {
  const base: LocalFaceSnapshot = {
    timestamp: Date.now(),
    ear: lastEar,
    eyesClosed: lastEar < calibratedEarThreshold,
    blinkDetected: false,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    faceDetected: false,
  };

  if (!landmarker || video.readyState < 2) return base;

  try {
    const result = landmarker.detectForVideo(video, timestampMs);
    if (!result.faceLandmarks?.length) { wasClosed = false; return base; }

    const landmarks = result.faceLandmarks[0];
    const leftEar = eyeAspectRatio(landmarks, LEFT_EYE);
    const rightEar = eyeAspectRatio(landmarks, RIGHT_EYE);
    const ear = (leftEar + rightEar) / 2;
    lastEar = ear;

    const blinkScore = getBlinkScore(result);
    if (blinkScore < 0.2 && ear > 0.12 && openEarSamples.length < 50) {
      openEarSamples.push(ear);
      const sorted = [...openEarSamples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      calibratedEarThreshold = Math.max(0.14, Math.min(0.25, median * 0.6));
    }
    const eyesClosed = ear < calibratedEarThreshold || blinkScore > BLINK_BLEND_THRESHOLD;
    const blinkDetected = wasClosed && !eyesClosed;
    wasClosed = eyesClosed;

    let headPose = { pitch: 0, yaw: 0, roll: 0 };
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    if (matrix && matrix.length >= 16) {
      headPose = matrixToEuler(Array.from(matrix));
    }

    return {
      timestamp: Date.now(),
      ear,
      eyesClosed,
      blinkDetected,
      headPose,
      faceDetected: true,
    };
  } catch (err) {
    console.error('Face detection error', err);
    return base;
  }
}
