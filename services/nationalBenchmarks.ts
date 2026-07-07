
import { NationalComparison, TripRecord } from '../types';

/** Reference cohort averages (US highway drivers, synthetic benchmark dataset). */
export const NATIONAL_BENCHMARKS = {
  avgSafetyScore: 85,
  stdSafetyScore: 12,
  avgPerclos: 8,
  stdPerclos: 5,
  avgHHI: 28,
  stdHHI: 15,
  avgDistraction: 22,
  harshBrakesPerHour: 2.1,
  stdHarshBrakes: 1.4,
  harshAccelsPerHour: 1.8,
  stdHarshAccels: 1.1,
};

function percentileFromNormal(value: number, mean: number, std: number): number {
  if (std <= 0) return 50;
  const z = (value - mean) / std;
  const pct = 50 * (1 + Math.tanh(z * 0.55));
  return Math.round(Math.max(1, Math.min(99, pct)));
}

/** Higher safety score = higher percentile (better). */
function safetyPercentile(score: number): number {
  return percentileFromNormal(score, NATIONAL_BENCHMARKS.avgSafetyScore, NATIONAL_BENCHMARKS.stdSafetyScore);
}

/** Fewer harsh brakes per hour = higher percentile (smoother driving). */
function brakePercentile(brakesPerHour: number): number {
  const inverted = NATIONAL_BENCHMARKS.harshBrakesPerHour * 2 - brakesPerHour;
  return percentileFromNormal(inverted, NATIONAL_BENCHMARKS.harshBrakesPerHour, NATIONAL_BENCHMARKS.stdHarshBrakes);
}

export function computeNationalComparison(trip: Partial<TripRecord> & {
  avgScore: number;
  avgPerclos: number;
  avgHHI: number;
  harshBrakes: number;
  durationMs: number;
}): NationalComparison {
  const hours = Math.max(trip.durationMs / 3_600_000, 1 / 60);
  const brakesPerHour = (trip.harshBrakes ?? 0) / hours;

  const safetyPct = safetyPercentile(trip.avgScore);
  const brakeSmoothnessPercentile = brakePercentile(brakesPerHour);
  const alertnessPercentile = percentileFromNormal(
    NATIONAL_BENCHMARKS.avgPerclos * 2 - trip.avgPerclos,
    NATIONAL_BENCHMARKS.avgPerclos,
    NATIONAL_BENCHMARKS.stdPerclos
  );
  const hypnosisRiskPercentile = percentileFromNormal(
    NATIONAL_BENCHMARKS.avgHHI * 2 - trip.avgHHI,
    NATIONAL_BENCHMARKS.avgHHI,
    NATIONAL_BENCHMARKS.stdHHI
  );

  let summary: string;
  if (safetyPct >= 75) {
    summary = `You drove safer than ${safetyPct}% of the national reference cohort.`;
  } else if (safetyPct >= 50) {
    summary = `Your safety index is near the national median (${NATIONAL_BENCHMARKS.avgSafetyScore}).`;
  } else {
    summary = `Your safety index is below the national median. Focus on rest and smoother inputs.`;
  }

  return {
    safetyPercentile: safetyPct,
    brakeSmoothnessPercentile,
    alertnessPercentile,
    hypnosisRiskPercentile,
    summary,
  };
}

export function overallNationalPercentile(comparison: NationalComparison): number {
  return Math.round(
    (comparison.safetyPercentile +
      comparison.brakeSmoothnessPercentile +
      comparison.alertnessPercentile +
      comparison.hypnosisRiskPercentile) / 4
  );
}
