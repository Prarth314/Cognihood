import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { LocalFaceSnapshot } from '../types';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_CLOSED_THRESHOLD = 0.18;

let landmarker: FaceLandmarker | null = null;
let initPromise: Promise<boolean> | null = null;
let lastEar = 0.3;
let wasClosed = false;
let leftOpenSamples: number[] = [];
let rightOpenSamples: number[] = [];

export function resetFaceTrackingState(): void {
  lastEar = 0.3;
  wasClosed = false;
  leftOpenSamples = [];
  rightOpenSamples = [];
}

export function bilateralClosure(
  left: number,
  right: number,
  leftBlink: number,
  rightBlink: number,
  leftThreshold: number,
  rightThreshold: number,
): boolean {
  return (left < leftThreshold && right < rightThreshold) || (leftBlink > 0.55 && rightBlink > 0.55);
}

function eyeThreshold(samples: number[], ear: number, blink: number): number {
  if (blink < 0.2 && ear > 0.03 && ear < 1 && samples.length < 50) samples.push(ear);
  if (samples.length < 10) return EAR_CLOSED_THRESHOLD;
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.max(0.04, Math.min(0.35, sorted[Math.floor(sorted.length / 2)] * 0.6));
}

function dist(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }, aspect = 1): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

export function eyeAspectRatio(
  landmarks: { x: number; y: number; z?: number }[],
  indices: number[],
  aspect = 1,
): number {
  const p = indices.map((i) => landmarks[i]);
  if (
    p.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  )
    return NaN;
  const vertical = dist(p[1], p[5], aspect) + dist(p[2], p[4], aspect);
  const horizontal = dist(p[0], p[3], aspect) * 2;
  return horizontal > 1e-6 ? vertical / horizontal : NaN;
}

function matrixToEuler(m: number[]): { pitch: number; yaw: number; roll: number } {
  const pitch = Math.asin(Math.max(-1, Math.min(1, -m[9])));
  const yaw = Math.atan2(m[8], m[10]);
  const roll = Math.atan2(m[4], m[0]);
  const toDeg = 180 / Math.PI;
  return { pitch: pitch * toDeg, yaw: yaw * toDeg, roll: roll * toDeg };
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
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        });
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
    eyesClosed: false,
    blinkDetected: false,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    faceDetected: false,
  };

  if (!landmarker || video.readyState < 2) return base;

  try {
    const result = landmarker.detectForVideo(video, timestampMs);
    if (!result.faceLandmarks?.length) {
      wasClosed = false;
      return base;
    }

    const landmarks = result.faceLandmarks[0];
    const aspect = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1;
    const leftEar = eyeAspectRatio(landmarks, LEFT_EYE, aspect);
    const rightEar = eyeAspectRatio(landmarks, RIGHT_EYE, aspect);
    if (![leftEar, rightEar].every(Number.isFinite)) {
      wasClosed = false;
      return base;
    }
    const ear = (leftEar + rightEar) / 2;
    lastEar = ear;

    const blends = result.faceBlendshapes?.[0]?.categories;
    const leftBlink = blends?.find((b) => b.categoryName === 'eyeBlinkLeft')?.score ?? 0;
    const rightBlink = blends?.find((b) => b.categoryName === 'eyeBlinkRight')?.score ?? 0;
    const eyesClosed = bilateralClosure(
      leftEar,
      rightEar,
      leftBlink,
      rightBlink,
      eyeThreshold(leftOpenSamples, leftEar, leftBlink),
      eyeThreshold(rightOpenSamples, rightEar, rightBlink),
    );
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
