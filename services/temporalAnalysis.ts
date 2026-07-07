
import { DriverMetrics, LocalFaceSnapshot, TemporalAnalysis } from '../types';

const WINDOW_30S = 30_000;
const WINDOW_60S = 60_000;
const EAR_CLOSED_THRESHOLD = 0.18;
const STAGNATION_VARIANCE_THRESHOLD = 2.5;

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

function computePerclos(snapshots: LocalFaceSnapshot[]): number {
  if (snapshots.length === 0) return 0;
  const closed = snapshots.filter(s => s.eyesClosed || s.ear < EAR_CLOSED_THRESHOLD).length;
  return (closed / snapshots.length) * 100;
}

function computeBlinkRate(snapshots: LocalFaceSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  const blinks = snapshots.filter(s => s.blinkDetected).length;
  const durationMin = (snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp) / 60_000;
  if (durationMin <= 0) return 0;
  return blinks / durationMin;
}

function computeGazeStagnation(snapshots: LocalFaceSnapshot[]): number {
  const withFace = snapshots.filter(s => s.faceDetected);
  if (withFace.length < 10) return 0;

  const yawVals = withFace.map(s => s.headPose.yaw);
  const pitchVals = withFace.map(s => s.headPose.pitch);
  const combinedVariance = variance(yawVals) + variance(pitchVals);

  // Low variance → high stagnation (highway hypnosis signal)
  const stagnation = Math.max(0, 100 - (combinedVariance / STAGNATION_VARIANCE_THRESHOLD) * 100);
  return Math.min(100, stagnation);
}

function computeMonotonyDuration(snapshots: LocalFaceSnapshot[]): number {
  if (snapshots.length < 5) return 0;

  const STAGNATION_DEG = 1.5;
  let streakStart: number | null = null;
  let maxStreakSec = 0;

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    if (!curr.faceDetected || curr.eyesClosed) {
      streakStart = null;
      continue;
    }

    const deltaYaw = Math.abs(curr.headPose.yaw - prev.headPose.yaw);
    const deltaPitch = Math.abs(curr.headPose.pitch - prev.headPose.pitch);
    const isStagnant = deltaYaw < STAGNATION_DEG && deltaPitch < STAGNATION_DEG;

    if (isStagnant) {
      if (streakStart === null) streakStart = prev.timestamp;
      const streakSec = (curr.timestamp - streakStart) / 1000;
      maxStreakSec = Math.max(maxStreakSec, streakSec);
    } else {
      streakStart = null;
    }
  }

  return maxStreakSec;
}

function computeHighwayHypnosisIndex(
  perclos30: number,
  gazeStagnation: number,
  monotonyDurationSec: number,
  blinkRatePerMin: number,
  cognitiveLoad: number
): number {
  const perclosComponent = Math.min(100, perclos30 * 2.5) * 0.25;
  const stagnationComponent = gazeStagnation * 0.25;
  const monotonyComponent = Math.min(100, (monotonyDurationSec / 60) * 100) * 0.2;
  const blinkFlatComponent = blinkRatePerMin < 8 && blinkRatePerMin > 0
    ? ((8 - blinkRatePerMin) / 8) * 100 * 0.15
    : 0;
  const lowEngagementComponent = Math.max(0, 50 - cognitiveLoad) * 0.15;

  return Math.min(100, Math.round(
    perclosComponent +
    stagnationComponent +
    monotonyComponent +
    blinkFlatComponent +
    lowEngagementComponent
  ));
}

export function computeTemporalAnalysis(
  snapshots: LocalFaceSnapshot[],
  geminiMetrics?: DriverMetrics
): TemporalAnalysis {
  const window30 = snapshots.filter(s => s.timestamp >= Date.now() - WINDOW_30S);
  const window60 = snapshots.filter(s => s.timestamp >= Date.now() - WINDOW_60S);

  const perclos30 = computePerclos(window30);
  const perclos60 = computePerclos(window60);
  const blinkRatePerMin = computeBlinkRate(window30);
  const gazeStagnation = computeGazeStagnation(window30);
  const headPoseVariance = variance(
    window30.filter(s => s.faceDetected).map(s => s.headPose.yaw + s.headPose.pitch)
  );
  const monotonyDurationSec = computeMonotonyDuration(window30);
  const faceDetectionRate = window30.length > 0
    ? (window30.filter(s => s.faceDetected).length / window30.length) * 100
    : 0;

  const cognitiveLoad = geminiMetrics?.cognitiveLoad ?? 30;

  const highwayHypnosisIndex = computeHighwayHypnosisIndex(
    perclos30,
    gazeStagnation,
    monotonyDurationSec,
    blinkRatePerMin,
    cognitiveLoad
  );

  return {
    perclos30,
    perclos60,
    blinkRatePerMin,
    gazeStagnation,
    headPoseVariance,
    highwayHypnosisIndex,
    monotonyDurationSec,
    sampleCount: window30.length,
    faceDetectionRate,
  };
}
