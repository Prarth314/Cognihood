
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
  cogLoadFromScore,
  tripStateFromScore,
} from './coachingService';

export class TripSession {
  static readonly MIN_DURATION_MS = 30_000;
  static readonly MIN_SCORE_SAMPLES = 3;
  readonly id: string;
  readonly startTime: number;
  readonly userId: string;
  readonly cloudConsentAt: number | null;
  private events: TripEvent[] = [];
  private scoreTimeline: { t: number; score: number }[] = [];
  private temporalCount = 0;
  private assessmentCount = 0;
  private perclosTotal = 0;
  private hhiTotal = 0;
  private distractionTotal = 0;
  private cognitiveTotal = 0;
  private scoreCount = 0;
  private scoreTotal = 0;
  private minimumScore = 100;
  private maximumScore = 0;
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

  constructor(userId: string, cloudAnalysisEnabled = false) {
    this.id = crypto.randomUUID();
    this.startTime = Date.now();
    this.userId = userId;
    this.cloudConsentAt = cloudAnalysisEnabled ? Date.now() : null;
  }

  recordAssessment(assessment: SafetyAssessment, temporal: TemporalAnalysis | null): void {
    const now = Date.now();
    if (now - this.lastScoreRecordAt >= 3000) {
      this.lastScoreRecordAt = now;
      const relT = now - this.startTime;
      this.scoreCount++;
      this.scoreTotal += assessment.score;
      this.minimumScore = Math.min(this.minimumScore, assessment.score);
      this.maximumScore = Math.max(this.maximumScore, assessment.score);
      if (this.scoreTimeline.length >= 5000) this.scoreTimeline = this.scoreTimeline.filter((_, index) => index % 2 === 0);
      this.scoreTimeline.push({ t: relT, score: assessment.score });
    }

    if (temporal) {
      this.temporalCount++;
      this.perclosTotal += temporal.perclos30;
      this.hhiTotal += temporal.highwayHypnosisIndex;
    }
    this.assessmentCount++;
    this.distractionTotal += assessment.metrics.distractionLevel;
    this.cognitiveTotal += assessment.metrics.cognitiveLoad;

    if (assessment.eligibility?.state === EligibilityState.INELIGIBLE && now - this.lastIneligibleAt > 30_000) {
      this.lastIneligibleAt = now;
      this.eligibilityFlags++;
      this.addEvent('INELIGIBLE', 90, assessment.eligibility.primaryReason);
    }

    if (temporal && temporal.highwayHypnosisIndex >= 55 && temporal.monotonyDurationSec >= 12 && now - this.lastHypnosisAt > 45_000) {
      this.lastHypnosisAt = now;
      this.hypnosisEvents++;
      this.addEvent('HYPNOSIS', temporal.highwayHypnosisIndex, 'Experimental low-engagement pattern flagged', {
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
    this.addEvent('HARSH_BRAKE', Math.min(100, decelG * 30), `Hard brake detected (${decelG.toFixed(1)}g)`, {
      decelG,
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

  finalize(baseline: CognitiveFingerprint | null): TripRecord | null {
    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    if (durationMs < TripSession.MIN_DURATION_MS || this.scoreCount < TripSession.MIN_SCORE_SAMPLES) {
      return null;
    }
    const avgScore = this.scoreTotal / this.scoreCount;
    const avgPerclos = this.temporalCount ? this.perclosTotal / this.temporalCount : 0;
    const avgHHI = this.temporalCount ? this.hhiTotal / this.temporalCount : 0;
    const avgDistraction = this.assessmentCount ? this.distractionTotal / this.assessmentCount : 0;
    const avgCognitive = this.assessmentCount ? this.cognitiveTotal / this.assessmentCount : 0;

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
      avgScore: Math.min(this.maximumScore, Math.max(this.minimumScore, avgScore)),
      minScore: this.minimumScore,
      maxScore: this.maximumScore,
      state: tripStateFromScore(avgScore),
      cogLoad: cogLoadFromScore(avgScore, avgCognitive),
      incidents: this.events.length,
      distanceMi: 0,
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
      algorithmVersion: '2026.10.13',
      measurementSource: 'BROWSER_CAMERA',
      cloudAnalysisUsed: this.cloudConsentAt !== null,
      cloudConsentAt: this.cloudConsentAt,
      dataQuality: 'VALID',
    };

    trip.fingerprintDeviation = computeFingerprintDeviation(trip, baseline);
    trip.recklessFlag = isRecklessDeviation(trip, baseline);
    trip.nationalPercentile = overallNationalPercentile(nationalComparison);

    if (trip.recklessFlag && !this.recklessFlagged) {
      this.recklessFlagged = true;
      this.addEvent('RECKLESS_DEVIATION', trip.fingerprintDeviation, 'Driving pattern differed materially from the personal reference baseline');
      trip.events = this.events;
      trip.incidents = this.events.length;
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
    if (this.events.length >= 500) return;
    this.events.push({
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      severity,
      message,
      metadata,
    });
  }
}
