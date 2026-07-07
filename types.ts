
export enum SafetyState {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OVERRIDE = 'OVERRIDE'
}

export enum AutonomyLevel {
  INFORM = 'INFORM',
  SUGGEST = 'SUGGEST',
  ASSIST = 'ASSIST',
  OVERRIDE = 'OVERRIDE'
}

export enum EligibilityState {
  ELIGIBLE = 'ELIGIBLE',
  MONITORING = 'MONITORING',
  CAUTION = 'CAUTION',
  INELIGIBLE = 'INELIGIBLE'
}

export type TripEventType =
  | 'HARSH_BRAKE'
  | 'HARSH_ACCEL'
  | 'HYPNOSIS'
  | 'INELIGIBLE'
  | 'ATTENTION_FAIL'
  | 'DISTRACTION'
  | 'FATIGUE'
  | 'RECKLESS_DEVIATION';

export interface DriverMetrics {
  ear: number;
  blinkRate: number;
  closureDuration: number;
  headPose: { pitch: number; yaw: number; roll: number };
  stressLevel: number;
  distractionLevel: number;
  cognitiveLoad: number;
}

export interface LocalFaceSnapshot {
  timestamp: number;
  ear: number;
  eyesClosed: boolean;
  blinkDetected: boolean;
  headPose: { pitch: number; yaw: number; roll: number };
  faceDetected: boolean;
}

export interface TemporalAnalysis {
  perclos30: number;
  perclos60: number;
  blinkRatePerMin: number;
  gazeStagnation: number;
  headPoseVariance: number;
  highwayHypnosisIndex: number;
  monotonyDurationSec: number;
  sampleCount: number;
  faceDetectionRate: number;
}

export interface EligibilityAssessment {
  state: EligibilityState;
  confidence: number;
  durationInStateSec: number;
  primaryReason: string;
  signals: string[];
  canDrive: boolean;
}

export interface NetworkEvent {
  id: string;
  type: 'FATIGUE_BEACON' | 'EMERGENCY_CORRIDOR' | 'GHOST_OBJECT' | 'DE_ESCALATION';
  originId: string;
  location: { lat: number; lng: number };
  severity: number;
  message: string;
}

export interface SafetyAssessment {
  score: number;
  state: SafetyState;
  autonomyLevel: AutonomyLevel;
  explanation: string;
  metrics: DriverMetrics;
  timestamp: number;
  intervention?: string;
  moodTrack?: string;
  temporal?: TemporalAnalysis;
  eligibility?: EligibilityAssessment;
}

export interface Poi {
  id: string;
  name: string;
  type: 'Rest Area' | 'Gas Station' | 'Coffee Shop' | 'Hospital';
  distance: string;
  time: string;
  cl_rating: 'LOW' | 'MED' | 'HIGH';
  coordinates: { lat: number; lng: number };
}

export interface TripEvent {
  id: string;
  type: TripEventType;
  timestamp: number;
  severity: number;
  message: string;
  metadata?: Record<string, number>;
}

export interface CoachingTip {
  id: string;
  icon: string;
  title: string;
  text: string;
  eventRef?: string;
}

export interface TripRecord {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  state: 'SAFE' | 'WARNING' | 'CRITICAL';
  cogLoad: 'LOW' | 'MED' | 'HIGH';
  incidents: number;
  distanceMi: number;
  events: TripEvent[];
  coachingTips: CoachingTip[];
  eligibilityFlags: number;
  hypnosisEvents: number;
  attentionFailures: number;
  harshBrakes: number;
  harshAccels: number;
  avgPerclos: number;
  avgHHI: number;
  avgDistraction: number;
  fingerprintDeviation: number;
  recklessFlag: boolean;
  nationalPercentile: number;
  nationalComparison: NationalComparison;
  scoreTimeline: { t: number; score: number }[];
}

export interface CognitiveFingerprint {
  userId: string;
  tripCount: number;
  avgSafetyScore: number;
  avgPerclos: number;
  avgHHI: number;
  avgDistraction: number;
  harshBrakesPerHour: number;
  harshAccelsPerHour: number;
  stdSafetyScore: number;
  stdHarshBrakes: number;
  updatedAt: number;
}

export interface NationalComparison {
  safetyPercentile: number;
  brakeSmoothnessPercentile: number;
  alertnessPercentile: number;
  hypnosisRiskPercentile: number;
  summary: string;
}

export interface PreDriveCheckResult {
  passed: boolean;
  perclos: number;
  faceDetectionRate: number;
  eligibility: EligibilityState;
  message: string;
  scanDurationSec: number;
}

export interface AggregateStats {
  totalDriveHours: number;
  globalSafetyRating: number;
  fingerprintDeviations: number;
  v2xContribution: number;
  tripCount: number;
}

// User ID is provided by Supabase Auth (see contexts/AuthContext.tsx)
