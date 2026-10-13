import {
  AutonomyLevel,
  DriverMetrics,
  LocalFaceSnapshot,
  SafetyAssessment,
  SafetyState,
  TemporalAnalysis,
} from '../types';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function createLocalSafetyAssessment(
  temporal: TemporalAnalysis,
  snapshot: LocalFaceSnapshot | null,
  previous?: SafetyAssessment | null
): SafetyAssessment {
  const faceDetected = snapshot?.faceDetected ?? false;
  const yaw = snapshot?.headPose.yaw ?? 0;
  const pitch = snapshot?.headPose.pitch ?? 0;
  const distractionLevel = faceDetected
    ? clamp(Math.max(Math.abs(yaw) - 12, Math.abs(pitch) - 15) * 3, 0, 100)
    : 70;
  const cognitiveLoad = clamp(
    temporal.highwayHypnosisIndex * 0.55 + temporal.perclos30 * 1.2 + distractionLevel * 0.25,
    0,
    100
  );

  const penalties =
    temporal.perclos30 * 1.15 +
    temporal.highwayHypnosisIndex * 0.45 +
    distractionLevel * 0.25 +
    (temporal.faceDetectionRate < 50 ? 15 : 0);
  const score = clamp(100 - penalties, 0, 100);

  let state = SafetyState.SAFE;
  if (temporal.perclos30 >= 25 || temporal.highwayHypnosisIndex >= 70 || score < 40) {
    state = SafetyState.CRITICAL;
  } else if (
    temporal.perclos30 >= 15 ||
    temporal.highwayHypnosisIndex >= 50 ||
    distractionLevel >= 60 ||
    score < 70
  ) {
    state = SafetyState.WARNING;
  }

  const metrics: DriverMetrics = {
    ear: snapshot?.ear ?? previous?.metrics.ear ?? 0.3,
    blinkRate: temporal.blinkRatePerMin,
    closureDuration: snapshot?.eyesClosed ? 0.1 : 0,
    headPose: snapshot?.headPose ?? previous?.metrics.headPose ?? { pitch: 0, yaw: 0, roll: 0 },
    stressLevel: previous?.metrics.stressLevel ?? 0,
    distractionLevel,
    cognitiveLoad,
  };

  const explanation = !faceDetected
    ? 'Local monitoring cannot see the driver clearly. Reposition the camera before continuing.'
    : state === SafetyState.CRITICAL
      ? 'Local temporal signals indicate a critical loss of alertness. Pull over safely as soon as possible.'
      : state === SafetyState.WARNING
        ? 'Local temporal signals show elevated fatigue, monotony, or distraction risk.'
        : temporal.sampleCount < 15
          ? 'Local monitoring is establishing a temporal baseline.'
          : 'Local eye, pose, and temporal signals are within the configured range.';

  return {
    score,
    state,
    autonomyLevel: state === SafetyState.CRITICAL ? AutonomyLevel.SUGGEST : AutonomyLevel.INFORM,
    explanation,
    metrics,
    timestamp: Date.now(),
    temporal,
    analysisSource: 'LOCAL',
  };
}
