
import {
  TripRecord,
  TripEvent,
  SafetyAssessment,
  TemporalAnalysis,
  EligibilityState,
} from '../types';
import { computeNationalComparison, overallNationalPercentile } from './nationalBenchmarks';
import {
  computeFingerprintDeviation,
  isRecklessDeviation,
} from './baselineService';
import { CognitiveFingerprint } from '../types';
import {
  generateCoachingTips,
  estimateDistanceMi,
  cogLoadFromScore,
  tripStateFromScore,
} from './coachingService';

export class TripSession {
  readonly id: string;
  readonly startTime: number;
  readonly userId: string;
  private events: TripEvent[] = [];
  private scoreTimeline: { t: number; score: number }[] = [];
  private perclosSamples: number[] = [];
  private hhiSamples: number[] = [];
  private distractionSamples: number[] = [];
  private cognitiveSamples: number[] = [];
  private lastIneligibleAt = 0;
  private lastHypnosisAt = 0;
  private lastDistractionAt = 0;
  private lastFatigueAt = 0;
  private eligibilityFlags = 0;
  private hypnosisEvents = 0;
  private attentionFailures = 0;
  private harshBrakes = 0;
  private harshAccels = 0;
  private recklessFlagged = false;
  private lastScoreRecordAt = 0;

  constructor(userId: string) {
    this.id = `TRIP_${Date.now()}`;
    this.startTime = Date.now();
    this.userId = userId;
  }

  recordAssessment(assessment: SafetyAssessment, temporal: TemporalAnalysis | null): void {
    const now = Date.now();
    if (now - this.lastScoreRecordAt >= 3000) {
      this.lastScoreRecordAt = now;
      const relT = now - this.startTime;
      this.scoreTimeline.push({ t: relT, score: assessment.score });
    }

    if (temporal) {
      this.perclosSamples.push(temporal.perclos30);
      this.hhiSamples.push(temporal.highwayHypnosisIndex);
    }
    this.distractionSamples.push(assessment.metrics.distractionLevel);
    this.cognitiveSamples.push(assessment.metrics.cognitiveLoad);

    if (assessment.eligibility?.state === EligibilityState.INELIGIBLE && now - this.lastIneligibleAt > 30_000) {
      this.lastIneligibleAt = now;
      this.eligibilityFlags++;
      this.addEvent('INELIGIBLE', 90, assessment.eligibility.primaryReason);
    }

    if (temporal && temporal.highwayHypnosisIndex >= 55 && temporal.monotonyDurationSec >= 12 && now - this.lastHypnosisAt > 45_000) {
      this.lastHypnosisAt = now;
      this.hypnosisEvents++;
      this.addEvent('HYPNOSIS', temporal.highwayHypnosisIndex, 'Highway hypnosis pattern detected', {
        durationSec: temporal.monotonyDurationSec,
        hhi: temporal.highwayHypnosisIndex,
      });
    }

    if (assessment.metrics.distractionLevel >= 65 && now - this.lastDistractionAt > 20_000) {
      this.lastDistractionAt = now;
      this.addEvent('DISTRACTION', assessment.metrics.distractionLevel, 'Sustained off-road gaze pattern');
    }

    if (temporal && temporal.perclos30 >= 18 && now - this.lastFatigueAt > 25_000) {
      this.lastFatigueAt = now;
      this.addEvent('FATIGUE', temporal.perclos30, 'Elevated eye closure percentage', { perclos: temporal.perclos30 });
    }
  }

  recordHarshBrake(decelG: number): void {
    this.harshBrakes++;
    const reactionDelay = 0.8 + Math.random() * 0.8;
    this.addEvent('HARSH_BRAKE', Math.min(100, decelG * 30), `Hard brake detected (${decelG.toFixed(1)}g)`, {
      decelG,
      reactionDelaySec: reactionDelay,
    });
  }

  recordHarshAccel(accelG: number): void {
    this.harshAccels++;
    this.addEvent('HARSH_ACCEL', Math.min(100, accelG * 25), `Aggressive acceleration (${accelG.toFixed(1)}g)`, { accelG });
  }

  recordAttentionFail(): void {
    this.attentionFailures++;
    this.addEvent('ATTENTION_FAIL', 70, 'Missed attention check prompt');
  }

  finalize(baseline: CognitiveFingerprint | null): TripRecord {
    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    const scores = this.scoreTimeline.map(s => s.score);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
    const avgPerclos = this.perclosSamples.length ? this.perclosSamples.reduce((a, b) => a + b, 0) / this.perclosSamples.length : 0;
    const avgHHI = this.hhiSamples.length ? this.hhiSamples.reduce((a, b) => a + b, 0) / this.hhiSamples.length : 0;
    const avgDistraction = this.distractionSamples.length ? this.distractionSamples.reduce((a, b) => a + b, 0) / this.distractionSamples.length : 0;
    const avgCognitive = this.cognitiveSamples.length ? this.cognitiveSamples.reduce((a, b) => a + b, 0) / this.cognitiveSamples.length : 0;

    const partial = {
      avgScore,
      avgPerclos,
      avgHHI,
      harshBrakes: this.harshBrakes,
      durationMs,
    };
    const nationalComparison = computeNationalComparison(partial);

    const trip: TripRecord = {
      id: this.id,
      userId: this.userId,
      startTime: this.startTime,
      endTime,
      durationMs,
      avgScore: Math.round(avgScore),
      minScore: scores.length ? Math.min(...scores) : 100,
      maxScore: scores.length ? Math.max(...scores) : 100,
      state: tripStateFromScore(avgScore),
      cogLoad: cogLoadFromScore(avgScore, avgCognitive),
      incidents: this.events.length,
      distanceMi: estimateDistanceMi(durationMs),
      events: this.events,
      coachingTips: [],
      eligibilityFlags: this.eligibilityFlags,
      hypnosisEvents: this.hypnosisEvents,
      attentionFailures: this.attentionFailures,
      harshBrakes: this.harshBrakes,
      harshAccels: this.harshAccels,
      avgPerclos,
      avgHHI,
      avgDistraction,
      fingerprintDeviation: 0,
      recklessFlag: false,
      nationalPercentile: 0,
      nationalComparison,
      scoreTimeline: this.scoreTimeline,
    };

    trip.fingerprintDeviation = computeFingerprintDeviation(trip, baseline);
    trip.recklessFlag = isRecklessDeviation(trip, baseline);
    trip.nationalPercentile = overallNationalPercentile(nationalComparison);

    if (trip.recklessFlag && !this.recklessFlagged) {
      this.recklessFlagged = true;
      this.addEvent('RECKLESS_DEVIATION', trip.fingerprintDeviation, 'Driving pattern deviated from personal baseline and national norms');
      trip.events = this.events;
    }

    trip.coachingTips = generateCoachingTips(trip);
    return trip;
  }

  private addEvent(
    type: TripEvent['type'],
    severity: number,
    message: string,
    metadata?: Record<string, number>
  ): void {
    this.events.push({
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: Date.now(),
      severity,
      message,
      metadata,
    });
  }
}
