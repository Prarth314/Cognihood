import {
  AutonomyLevel,
  DriverMetrics,
  LocalFaceSnapshot,
  SafetyAssessment,
  SafetyState,
  TemporalAnalysis,
} from '../types';
import { getSupabase } from './supabaseClient';

type RemoteAnalysis = {
  metrics: Omit<DriverMetrics, 'cognitiveLoad'>;
  cognitiveLoad: number;
  autonomyLevel: AutonomyLevel;
  explanation: string;
  moodIntervention?: string;
  fingerprintDeviation: number;
};

const MAX_IMAGE_BASE64_LENGTH = 1_500_000;
const VALID_AUTONOMY = new Set(Object.values(AutonomyLevel));

function clampNumber(value: unknown, min: number, max: number, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeText(value: unknown, maxLength: number, fallback: string): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function validateRemoteAnalysis(value: unknown): RemoteAnalysis {
  if (!value || typeof value !== 'object') throw new Error('AI service returned an invalid response.');
  const input = value as Record<string, unknown>;
  const rawMetrics = input.metrics;
  if (!rawMetrics || typeof rawMetrics !== 'object') throw new Error('AI response omitted metrics.');
  const metrics = rawMetrics as Record<string, unknown>;
  const rawPose = metrics.headPose;
  if (!rawPose || typeof rawPose !== 'object') throw new Error('AI response omitted head pose.');
  const pose = rawPose as Record<string, unknown>;
  const autonomy = VALID_AUTONOMY.has(input.autonomyLevel as AutonomyLevel)
    ? input.autonomyLevel as AutonomyLevel
    : AutonomyLevel.INFORM;

  return {
    metrics: {
      ear: clampNumber(metrics.ear, 0, 1, 0.3),
      blinkRate: clampNumber(metrics.blinkRate, 0, 120, 12),
      closureDuration: clampNumber(metrics.closureDuration, 0, 60),
      headPose: {
        pitch: clampNumber(pose.pitch, -90, 90),
        yaw: clampNumber(pose.yaw, -90, 90),
        roll: clampNumber(pose.roll, -90, 90),
      },
      stressLevel: 0,
      distractionLevel: clampNumber(metrics.distractionLevel, 0, 100),
    },
    cognitiveLoad: clampNumber(input.cognitiveLoad, 0, 100),
    autonomyLevel: autonomy,
    explanation: safeText(input.explanation, 500, 'Remote analysis returned no explanation.'),
    moodIntervention: safeText(input.moodIntervention, 240, ''),
    fingerprintDeviation: clampNumber(input.fingerprintDeviation, 0, 100),
  };
}

export function mergeLocalIntoMetrics(
  remoteMetrics: DriverMetrics,
  local: LocalFaceSnapshot | null,
  temporal?: TemporalAnalysis | null
): DriverMetrics {
  if (!local?.faceDetected) return remoteMetrics;
  return {
    ...remoteMetrics,
    ear: clampNumber(local.ear, 0, 1, remoteMetrics.ear),
    blinkRate: temporal?.blinkRatePerMin ?? remoteMetrics.blinkRate,
    headPose: local.headPose,
    closureDuration: local.eyesClosed
      ? Math.min(60, remoteMetrics.closureDuration + 0.1)
      : Math.max(0, remoteMetrics.closureDuration - 0.05),
  };
}

export async function analyzeDrivingEnvironment(
  base64Image: string,
  history: SafetyAssessment[],
  temporal?: TemporalAnalysis | null,
  localSnapshot?: LocalFaceSnapshot | null
): Promise<SafetyAssessment> {
  if (!base64Image || base64Image.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error('Camera frame is empty or exceeds the secure upload limit.');
  }

  const { data, error } = await getSupabase().functions.invoke('gemini-assist', {
    body: {
      action: 'analyze',
      imageBase64: base64Image,
      previousScore: history.at(-1)?.score ?? 100,
      temporal: temporal ? {
        perclos30: temporal.perclos30,
        highwayHypnosisIndex: temporal.highwayHypnosisIndex,
        gazeStagnation: temporal.gazeStagnation,
        monotonyDurationSec: temporal.monotonyDurationSec,
        blinkRatePerMin: temporal.blinkRatePerMin,
      } : null,
    },
  });
  if (error) throw new Error(`Remote analysis unavailable: ${error.message}`);

  const result = validateRemoteAnalysis(data);
  let metrics: DriverMetrics = { ...result.metrics, cognitiveLoad: result.cognitiveLoad };
  metrics = mergeLocalIntoMetrics(metrics, localSnapshot ?? null, temporal);

  const penalty =
    metrics.distractionLevel * 0.55 +
    metrics.cognitiveLoad * 0.15 +
    (temporal?.perclos30 ?? 0) * 0.35 +
    (temporal?.highwayHypnosisIndex ?? 0) * 0.2;
  const score = clampNumber(100 - penalty, 0, 100, history.at(-1)?.score ?? 50);

  let state = SafetyState.SAFE;
  if (score < 40 || (temporal?.perclos30 ?? 0) >= 25) state = SafetyState.CRITICAL;
  else if (score < 70 || (temporal?.highwayHypnosisIndex ?? 0) >= 55) state = SafetyState.WARNING;

  return {
    score,
    state,
    autonomyLevel: result.autonomyLevel,
    explanation: result.explanation,
    metrics,
    intervention: result.moodIntervention || undefined,
    timestamp: Date.now(),
    temporal: temporal ?? undefined,
    analysisSource: 'REMOTE',
  };
}
