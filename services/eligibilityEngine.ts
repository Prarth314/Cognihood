
import { EligibilityAssessment, EligibilityState, TemporalAnalysis, SafetyAssessment, SafetyState } from '../types';

const UPGRADE_HOLD_MS = 8_000;
const DOWNGRADE_HOLD_MS = 3_000;

function deriveCandidateState(temporal: TemporalAnalysis, gemini?: SafetyAssessment): {
  state: EligibilityState;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Sustained eye closure / drowsiness (PERCLOS-based)
  if (temporal.perclos30 >= 25) {
    reasons.push(`PERCLOS 30s at ${temporal.perclos30.toFixed(1)}% (threshold 25%)`);
    return { state: EligibilityState.INELIGIBLE, reasons };
  }

  // Highway hypnosis: stagnant gaze + monotony
  if (temporal.highwayHypnosisIndex >= 65 && temporal.monotonyDurationSec >= 15) {
    reasons.push(`Highway hypnosis index ${temporal.highwayHypnosisIndex} with ${temporal.monotonyDurationSec.toFixed(0)}s monotony`);
    return { state: EligibilityState.INELIGIBLE, reasons };
  }

  if (temporal.highwayHypnosisIndex >= 55 || temporal.gazeStagnation >= 70) {
    reasons.push(`Elevated hypnosis risk (HHI ${temporal.highwayHypnosisIndex}, gaze stagnation ${temporal.gazeStagnation.toFixed(0)}%)`);
    if (temporal.monotonyDurationSec >= 8) {
      return { state: EligibilityState.INELIGIBLE, reasons };
    }
    return { state: EligibilityState.CAUTION, reasons };
  }

  if (temporal.perclos30 >= 15) {
    reasons.push(`PERCLOS 30s at ${temporal.perclos30.toFixed(1)}% (caution threshold 15%)`);
    return { state: EligibilityState.CAUTION, reasons };
  }

  if (gemini?.state === SafetyState.CRITICAL) {
    reasons.push('Gemini safety assessment: CRITICAL');
    return { state: EligibilityState.INELIGIBLE, reasons };
  }

  if (gemini?.state === SafetyState.WARNING || temporal.highwayHypnosisIndex >= 40) {
    if (temporal.highwayHypnosisIndex >= 40) {
      reasons.push(`HHI trending elevated (${temporal.highwayHypnosisIndex})`);
    }
    if (gemini?.state === SafetyState.WARNING) {
      reasons.push('Gemini safety assessment: WARNING');
    }
    return { state: EligibilityState.MONITORING, reasons };
  }

  if (temporal.sampleCount < 15) {
    reasons.push('Establishing temporal baseline…');
    return { state: EligibilityState.MONITORING, reasons };
  }

  reasons.push('Temporal signals within safe range');
  return { state: EligibilityState.ELIGIBLE, reasons };
}

function computeConfidence(temporal: TemporalAnalysis): number {
  const sampleFactor = Math.min(100, (temporal.sampleCount / 60) * 100);
  const faceFactor = temporal.faceDetectionRate;
  return Math.round(Math.min(100, sampleFactor * 0.5 + faceFactor * 0.5));
}

function isWorseState(next: EligibilityState, current: EligibilityState): boolean {
  const order = [
    EligibilityState.ELIGIBLE,
    EligibilityState.MONITORING,
    EligibilityState.CAUTION,
    EligibilityState.INELIGIBLE,
  ];
  return order.indexOf(next) > order.indexOf(current);
}

export class EligibilityEngine {
  private currentState = EligibilityState.MONITORING;
  private stateEnteredAt = Date.now();
  private pendingState: EligibilityState | null = null;
  private pendingSince = 0;

  reset(): void {
    this.currentState = EligibilityState.MONITORING;
    this.stateEnteredAt = Date.now();
    this.pendingState = null;
    this.pendingSince = 0;
  }

  evaluate(temporal: TemporalAnalysis, gemini?: SafetyAssessment): EligibilityAssessment {
    const { state: candidate, reasons } = deriveCandidateState(temporal, gemini);
    const now = Date.now();

    if (candidate !== this.currentState) {
      if (this.pendingState !== candidate) {
        this.pendingState = candidate;
        this.pendingSince = now;
      }

      const holdMs = isWorseState(candidate, this.currentState) ? DOWNGRADE_HOLD_MS : UPGRADE_HOLD_MS;
      const requiredExtra = candidate === EligibilityState.INELIGIBLE ? 2_000 : 0;

      if (now - this.pendingSince >= holdMs + requiredExtra) {
        this.currentState = candidate;
        this.stateEnteredAt = now;
        this.pendingState = null;
      }
    } else {
      this.pendingState = null;
    }

    const durationInStateSec = (now - this.stateEnteredAt) / 1000;
    const confidence = computeConfidence(temporal);
    const canDrive = this.currentState === EligibilityState.ELIGIBLE ||
      this.currentState === EligibilityState.MONITORING;

    const primaryReason = reasons[0] ?? 'Monitoring active';

    return {
      state: this.currentState,
      confidence,
      durationInStateSec,
      primaryReason,
      signals: reasons,
      canDrive,
    };
  }
}
