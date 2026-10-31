import type { LocalFaceSnapshot, SafetyAssessment, TemporalAnalysis, EligibilityAssessment } from '../types';
import { createLocalSafetyAssessment } from './localSafetyService';

/** Rebase a completed provider request on current evidence, never its captured state. */
export function applyCloudCommentary(remote: SafetyAssessment, temporal: TemporalAnalysis,
  snapshot: LocalFaceSnapshot | null, eligibility: EligibilityAssessment): SafetyAssessment | null {
  if (!snapshot?.faceDetected || Date.now() - snapshot.timestamp > 500 || Date.now() < snapshot.timestamp ||
    temporal.faceDetectionRate < 70 || temporal.sampleCount < 15) return null;
  return { ...createLocalSafetyAssessment(temporal, snapshot), eligibility,
    cloudCommentary: remote.explanation.slice(0, 500), analysisSource: 'LOCAL' };
}
