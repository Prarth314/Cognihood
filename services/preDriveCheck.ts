
import { LocalFaceSnapshot } from '../types';
import { computeTemporalAnalysis } from './temporalAnalysis';
import { EligibilityState, PreDriveCheckResult } from '../types';

const SCAN_DURATION_MS = 15_000;
const MIN_SAMPLES = 30;

export function evaluatePreDriveCheck(
  snapshots: LocalFaceSnapshot[],
  scanStartedAt: number
): PreDriveCheckResult {
  const elapsed = Date.now() - scanStartedAt;
  const scanDurationSec = elapsed / 1000;

  if (elapsed < SCAN_DURATION_MS) {
    const temporal = computeTemporalAnalysis(snapshots);
    return {
      passed: false,
      perclos: temporal.perclos30,
      faceDetectionRate: temporal.faceDetectionRate,
      eligibility: EligibilityState.MONITORING,
      message: `Scanning… ${Math.ceil((SCAN_DURATION_MS - elapsed) / 1000)}s remaining`,
      scanDurationSec,
    };
  }

  const temporal = computeTemporalAnalysis(snapshots);

  if (temporal.sampleCount < MIN_SAMPLES) {
    return {
      passed: false,
      perclos: temporal.perclos30,
      faceDetectionRate: temporal.faceDetectionRate,
      eligibility: EligibilityState.MONITORING,
      message: 'Insufficient face data. Ensure camera has clear view of your face.',
      scanDurationSec,
    };
  }

  if (temporal.faceDetectionRate < 70) {
    return {
      passed: false,
      perclos: temporal.perclos30,
      faceDetectionRate: temporal.faceDetectionRate,
      eligibility: EligibilityState.CAUTION,
      message: 'Face not consistently detected. Adjust camera position.',
      scanDurationSec,
    };
  }

  if (temporal.perclos30 >= 15) {
    return {
      passed: false,
      perclos: temporal.perclos30,
      faceDetectionRate: temporal.faceDetectionRate,
      eligibility: EligibilityState.INELIGIBLE,
      message: `Eye closure elevated (PERCLOS ${temporal.perclos30.toFixed(1)}%). Rest before driving.`,
      scanDurationSec,
    };
  }

  if (temporal.highwayHypnosisIndex >= 40) {
    return {
      passed: false,
      perclos: temporal.perclos30,
      faceDetectionRate: temporal.faceDetectionRate,
      eligibility: EligibilityState.CAUTION,
      message: 'Low engagement detected. Take a moment to orient before starting.',
      scanDurationSec,
    };
  }

  return {
    passed: true,
    perclos: temporal.perclos30,
    faceDetectionRate: temporal.faceDetectionRate,
    eligibility: EligibilityState.ELIGIBLE,
    message: 'Pre-drive check passed. You are cleared to begin monitoring.',
    scanDurationSec,
  };
}

export const PRE_DRIVE_SCAN_MS = SCAN_DURATION_MS;
