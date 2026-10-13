
import { CognitiveFingerprint, TripRecord } from '../types';
import { NATIONAL_BENCHMARKS } from './nationalBenchmarks';

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
  const abovePrototypeReference = tripBrakesPerHour > NATIONAL_BENCHMARKS.harshBrakesPerHour * 1.5;
  const deviation = computeFingerprintDeviation(trip, baseline);

  return tripBrakesPerHour > threshold && abovePrototypeReference && deviation >= 40;
}

export function computeAggregateStats(trips: TripRecord[], baseline: CognitiveFingerprint | null) {
  const totalMs = trips.reduce((s, t) => s + t.durationMs, 0);
  const avgScore = trips.length
    ? trips.reduce((s, t) => s + t.avgScore, 0) / trips.length
    : 0;
  const deviations = trips.map(t => computeFingerprintDeviation(t, baseline));
  const avgDeviation = deviations.length
    ? deviations.reduce((a, b) => a + b, 0) / deviations.length
    : 0;

  return {
    totalDriveHours: totalMs / 3_600_000,
    globalSafetyRating: avgScore,
    fingerprintDeviations: avgDeviation,
    v2xContribution: 0,
    tripCount: trips.length,
  };
}
