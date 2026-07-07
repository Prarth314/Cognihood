
import { CognitiveFingerprint, TripRecord } from '../types';
import { NATIONAL_BENCHMARKS } from './nationalBenchmarks';

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

export function computeFingerprint(trips: TripRecord[], userId: string): CognitiveFingerprint | null {
  if (trips.length === 0) return null;

  const scores = trips.map(t => t.avgScore);
  const perclos = trips.map(t => t.avgPerclos);
  const hhi = trips.map(t => t.avgHHI);
  const distraction = trips.map(t => t.avgDistraction);

  const hours = trips.map(t => Math.max(t.durationMs / 3_600_000, 1 / 60));
  const brakesPerHour = trips.map((t, i) => t.harshBrakes / hours[i]);
  const accelsPerHour = trips.map((t, i) => t.harshAccels / hours[i]);

  return {
    userId,
    tripCount: trips.length,
    avgSafetyScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    avgPerclos: perclos.reduce((a, b) => a + b, 0) / perclos.length,
    avgHHI: hhi.reduce((a, b) => a + b, 0) / hhi.length,
    avgDistraction: distraction.reduce((a, b) => a + b, 0) / distraction.length,
    harshBrakesPerHour: brakesPerHour.reduce((a, b) => a + b, 0) / brakesPerHour.length,
    harshAccelsPerHour: accelsPerHour.reduce((a, b) => a + b, 0) / accelsPerHour.length,
    stdSafetyScore: stdDev(scores),
    stdHarshBrakes: stdDev(brakesPerHour),
    updatedAt: Date.now(),
  };
}

export function computeFingerprintDeviation(
  trip: TripRecord,
  baseline: CognitiveFingerprint | null
): number {
  if (!baseline || baseline.tripCount < 2) return 0;

  const hours = Math.max(trip.durationMs / 3_600_000, 1 / 60);
  const tripBrakesPerHour = trip.harshBrakes / hours;

  const scoreDev = Math.abs(trip.avgScore - baseline.avgSafetyScore) / Math.max(baseline.stdSafetyScore, 5);
  const brakeDev = Math.abs(tripBrakesPerHour - baseline.harshBrakesPerHour) / Math.max(baseline.stdHarshBrakes, 0.5);
  const perclosDev = Math.abs(trip.avgPerclos - baseline.avgPerclos) / 8;
  const hhiDev = Math.abs(trip.avgHHI - baseline.avgHHI) / 20;

  const raw = (scoreDev + brakeDev + perclosDev + hhiDev) / 4;
  return Math.min(100, Math.round(raw * 25));
}

export function isRecklessDeviation(
  trip: TripRecord,
  baseline: CognitiveFingerprint | null
): boolean {
  if (!baseline || baseline.tripCount < 3) return false;

  const hours = Math.max(trip.durationMs / 3_600_000, 1 / 60);
  const tripBrakesPerHour = trip.harshBrakes / hours;
  const threshold = baseline.harshBrakesPerHour + 2 * Math.max(baseline.stdHarshBrakes, 0.5);
  const aboveNational = tripBrakesPerHour > NATIONAL_BENCHMARKS.harshBrakesPerHour * 1.5;
  const deviation = computeFingerprintDeviation(trip, baseline);

  return tripBrakesPerHour > threshold && aboveNational && deviation >= 40;
}

export function computeAggregateStats(trips: TripRecord[], baseline: CognitiveFingerprint | null) {
  const totalMs = trips.reduce((s, t) => s + t.durationMs, 0);
  const avgScore = trips.length
    ? trips.reduce((s, t) => s + t.avgScore, 0) / trips.length
    : 0;
  const deviations = trips.map(t => computeFingerprintDeviation(t, baseline));
  const avgDeviation = deviations.length
    ? deviations.reduce((a, b) => a + b, 0) / deviations.length / 100
    : 0;

  return {
    totalDriveHours: totalMs / 3_600_000,
    globalSafetyRating: avgScore,
    fingerprintDeviations: avgDeviation,
    v2xContribution: trips.length > 0 ? 14 : 0,
    tripCount: trips.length,
  };
}
