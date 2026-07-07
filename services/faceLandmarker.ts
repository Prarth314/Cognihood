
import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { LocalFaceSnapshot } from '../types';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
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
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      return true;
    } catch (err) {
      console.error('FaceLandmarker init failed', err);
      return false;
    }
  })();

  return initPromise;
}

export function isFaceLandmarkerReady(): boolean {
  return landmarker !== null;
}

export function detectFaceFromVideo(video: HTMLVideoElement, timestampMs: number): LocalFaceSnapshot {
  const base: LocalFaceSnapshot = {
    timestamp: timestampMs,
    ear: lastEar,
    eyesClosed: lastEar < EAR_CLOSED_THRESHOLD,
    blinkDetected: false,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    faceDetected: false,
  };

  if (!landmarker || video.readyState < 2) return base;

  try {
    const result = landmarker.detectForVideo(video, timestampMs);
    if (!result.faceLandmarks?.length) return base;

    const landmarks = result.faceLandmarks[0];
    const leftEar = eyeAspectRatio(landmarks, LEFT_EYE);
    const rightEar = eyeAspectRatio(landmarks, RIGHT_EYE);
    const ear = (leftEar + rightEar) / 2;
    lastEar = ear;

    const blinkScore = getBlinkScore(result);
    const eyesClosed = ear < EAR_CLOSED_THRESHOLD || blinkScore > BLINK_BLEND_THRESHOLD;
    const blinkDetected = (wasClosed && !eyesClosed) || (blinkScore > BLINK_BLEND_THRESHOLD && !wasClosed);
    wasClosed = eyesClosed;

    let headPose = { pitch: 0, yaw: 0, roll: 0 };
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    if (matrix && matrix.length >= 16) {
      headPose = matrixToEuler(Array.from(matrix));
    }

    return {
      timestamp: timestampMs,
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
