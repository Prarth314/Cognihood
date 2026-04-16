
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

export interface DriverMetrics {
  ear: number;
  blinkRate: number;
  closureDuration: number;
  headPose: { pitch: number; yaw: number; roll: number };
  stressLevel: number;
  distractionLevel: number;
  cognitiveLoad: number; // 0-100
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
}

export interface Poi {
  id: string;
  name: string;
  type: 'Rest Area' | 'Gas Station' | 'Coffee Shop' | 'Hospital';
  distance: string;
  time: string;
  cl_rating: 'LOW' | 'MED' | 'HIGH'; // Cognitive Load Rating
  coordinates: { lat: number; lng: number };
}

export type SafetyStatus = 'POOR' | 'NOMINAL' | 'EXCELLENT';

export interface TripRecord {
  id: string;
  userId: string;
  startTime: number;
  durationMinutes: number;
  avgSafetyIndex: number;
  incidentCount: number;
  status: SafetyStatus;
}
