import { DriverMetrics, LocalFaceSnapshot, TemporalAnalysis } from '../types';

const WINDOW_30S = 30_000;
const WINDOW_60S = 60_000;
const STAGNATION_VARIANCE_THRESHOLD = 2.5;

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

function computePerclos(snapshots: LocalFaceSnapshot[]): number {
  let observedMs = 0;
  let closedMs = 0;
  let closureRun = 0;
  const finishRun = () => {
    if (closureRun >= 500) closedMs += closureRun;
    closureRun = 0;
  };
  for (let i = 1; i < snapshots.length; i++) {
    const previous = snapshots[i - 1];
    const current = snapshots[i];
    const duration = current.timestamp - previous.timestamp;
    // Never extrapolate through missing faces or stalled/dropped-frame intervals.
    if (!previous.faceDetected || !current.faceDetected || duration <= 0 || duration > 500) {
      finishRun();
      continue;
    }
    observedMs += duration;
    if (previous.eyesClosed && current.eyesClosed) closureRun += duration;
    else finishRun();
  }
  finishRun();
  return observedMs ? (closedMs / observedMs) * 100 : 0;
}

function computeBlinkRate(snapshots: LocalFaceSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  const blinks = snapshots.filter((s) => s.faceDetected && s.blinkDetected).length;
  const durationMin = (snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp) / 60_000;
  if (durationMin <= 0) return 0;
  return Math.min(120, blinks / durationMin);
}

function computeGazeStagnation(snapshots: LocalFaceSnapshot[]): number {
  const withFace = snapshots.filter((s) => s.faceDetected);
  if (withFace.length < 10) return 0;

  const yawVals = withFace.map((s) => s.headPose.yaw);
  const pitchVals = withFace.map((s) => s.headPose.pitch);
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
    if (!prev.faceDetected || !curr.faceDetected || curr.eyesClosed || curr.timestamp - prev.timestamp > 500) {
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
  cognitiveLoad: number,
): number {
  const perclosComponent = Math.min(100, perclos30 * 2.5) * 0.25;
  const stagnationComponent = gazeStagnation * 0.25;
  const monotonyComponent = Math.min(100, (monotonyDurationSec / 60) * 100) * 0.2;
  const blinkFlatComponent = blinkRatePerMin < 8 && blinkRatePerMin > 0 ? ((8 - blinkRatePerMin) / 8) * 100 * 0.15 : 0;
  const lowEngagementComponent = Math.max(0, 50 - cognitiveLoad) * 0.15;

  return Math.min(
    100,
    Math.round(
      perclosComponent + stagnationComponent + monotonyComponent + blinkFlatComponent + lowEngagementComponent,
    ),
  );
}

export function computeTemporalAnalysis(
  snapshots: LocalFaceSnapshot[],
  geminiMetrics?: DriverMetrics,
): TemporalAnalysis {
  const now = Date.now();
  // Last observation wins for duplicate timestamps; reject nonfinite/future inputs.
  const clean = [
    ...new Map(
      snapshots
        .filter((s) => Number.isFinite(s.timestamp) && s.timestamp <= now)
        .map((s) =>
          Number.isFinite(s.ear) &&
          s.ear >= 0 &&
          [s.headPose.yaw, s.headPose.pitch, s.headPose.roll].every(Number.isFinite)
            ? s
            : {
                ...s,
                faceDetected: false,
                eyesClosed: false,
                blinkDetected: false,
                ear: 0,
                headPose: { yaw: 0, pitch: 0, roll: 0 },
              },
        )
        .map((s) => [s.timestamp, s]),
    ).values(),
  ].sort((a, b) => a.timestamp - b.timestamp);
  const window30 = clean.filter((s) => s.timestamp >= now - WINDOW_30S);
  const window60 = clean.filter((s) => s.timestamp >= now - WINDOW_60S);

  const perclos30 = computePerclos(window30);
  const perclos60 = computePerclos(window60);
  const blinkRatePerMin = computeBlinkRate(window30);
  const gazeStagnation = computeGazeStagnation(window30);
  const validPoses = window30.filter((s) => s.faceDetected).map((s) => s.headPose);
  const headPoseVariance = variance(validPoses.map((p) => p.yaw)) + variance(validPoses.map((p) => p.pitch));
  const monotonyDurationSec = computeMonotonyDuration(window30);
  let faceDetectionRate =
    window30.length > 0 ? (window30.filter((s) => s.faceDetected).length / window30.length) * 100 : 0;
  // Coverage includes unobserved gaps; a high count of old frames is not live evidence.
  if (window30.length > 1) {
    let visibleMs = 0;
    for (let i = 1; i < window30.length; i++) {
      const previous = window30[i - 1],
        current = window30[i];
      if (previous.faceDetected && current.faceDetected)
        visibleMs += Math.min(500, current.timestamp - previous.timestamp);
    }
    faceDetectionRate = (visibleMs / Math.max(1, now - window30[0].timestamp)) * 100;
  }
  if (!window30.length || now - window30[window30.length - 1].timestamp > 500) faceDetectionRate = 0;
  let closureDurationSec = 0;
  const latest = window30.at(-1);
  if (latest?.faceDetected && latest.eyesClosed && now - latest.timestamp <= 500) {
    let start = latest.timestamp;
    for (let i = window30.length - 2; i >= 0; i--) {
      const frame = window30[i];
      if (!frame.faceDetected || !frame.eyesClosed || start - frame.timestamp > 500) break;
      start = frame.timestamp;
    }
    closureDurationSec = (latest.timestamp - start) / 1000;
  }

  const cognitiveLoad = geminiMetrics?.cognitiveLoad ?? 30;

  const highwayHypnosisIndex = computeHighwayHypnosisIndex(
    perclos30,
    gazeStagnation,
    monotonyDurationSec,
    blinkRatePerMin,
    cognitiveLoad,
  );

  return {
    closureDurationSec,
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
