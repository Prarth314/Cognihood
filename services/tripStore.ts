
import { TripRecord, CognitiveFingerprint } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

type TripRow = {
  id: string;
  user_id: string;
  start_time: number;
  end_time: number;
  duration_ms: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  state: string;
  cog_load: string;
  incidents: number;
  distance_mi: number;
  events: unknown;
  coaching_tips: unknown;
  eligibility_flags: number;
  hypnosis_events: number;
  attention_failures: number;
  harsh_brakes: number;
  harsh_accels: number;
  avg_perclos: number;
  avg_hhi: number;
  avg_distraction: number;
  fingerprint_deviation: number;
  reckless_flag: boolean;
  national_percentile: number;
  national_comparison: unknown;
  score_timeline: unknown;
};

type FingerprintRow = {
  user_id: string;
  trip_count: number;
  avg_safety_score: number;
  avg_perclos: number;
  avg_hhi: number;
  avg_distraction: number;
  harsh_brakes_per_hour: number;
  harsh_accels_per_hour: number;
  std_safety_score: number;
  std_harsh_brakes: number;
  updated_at: number;
};

function requireUserId(userId?: string): string {
  if (!userId) throw new Error('User must be signed in to access trip data.');
  return userId;
}

function tripToRow(trip: TripRecord): TripRow {
  return {
    id: trip.id,
    user_id: trip.userId,
    start_time: trip.startTime,
    end_time: trip.endTime,
    duration_ms: trip.durationMs,
    avg_score: trip.avgScore,
    min_score: trip.minScore,
    max_score: trip.maxScore,
    state: trip.state,
    cog_load: trip.cogLoad,
    incidents: trip.incidents,
    distance_mi: trip.distanceMi,
    events: trip.events,
    coaching_tips: trip.coachingTips,
    eligibility_flags: trip.eligibilityFlags,
    hypnosis_events: trip.hypnosisEvents,
    attention_failures: trip.attentionFailures,
    harsh_brakes: trip.harshBrakes,
    harsh_accels: trip.harshAccels,
    avg_perclos: trip.avgPerclos,
    avg_hhi: trip.avgHHI,
    avg_distraction: trip.avgDistraction,
    fingerprint_deviation: trip.fingerprintDeviation,
    reckless_flag: trip.recklessFlag,
    national_percentile: trip.nationalPercentile,
    national_comparison: trip.nationalComparison,
    score_timeline: trip.scoreTimeline,
  };
}

function rowToTrip(row: TripRow): TripRecord {
  return {
    id: row.id,
    userId: row.user_id,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMs: row.duration_ms,
    avgScore: Number(row.avg_score),
    minScore: Number(row.min_score),
    maxScore: Number(row.max_score),
    state: row.state as TripRecord['state'],
    cogLoad: row.cog_load as TripRecord['cogLoad'],
    incidents: row.incidents,
    distanceMi: Number(row.distance_mi),
    events: row.events as TripRecord['events'],
    coachingTips: row.coaching_tips as TripRecord['coachingTips'],
    eligibilityFlags: row.eligibility_flags,
    hypnosisEvents: row.hypnosis_events,
    attentionFailures: row.attention_failures,
    harshBrakes: row.harsh_brakes,
    harshAccels: row.harsh_accels,
    avgPerclos: Number(row.avg_perclos),
    avgHHI: Number(row.avg_hhi),
    avgDistraction: Number(row.avg_distraction),
    fingerprintDeviation: Number(row.fingerprint_deviation),
    recklessFlag: row.reckless_flag,
    nationalPercentile: row.national_percentile,
    nationalComparison: row.national_comparison as TripRecord['nationalComparison'],
    scoreTimeline: row.score_timeline as TripRecord['scoreTimeline'],
  };
}

function fingerprintToRow(fp: CognitiveFingerprint): FingerprintRow {
  return {
    user_id: fp.userId,
    trip_count: fp.tripCount,
    avg_safety_score: fp.avgSafetyScore,
    avg_perclos: fp.avgPerclos,
    avg_hhi: fp.avgHHI,
    avg_distraction: fp.avgDistraction,
    harsh_brakes_per_hour: fp.harshBrakesPerHour,
    harsh_accels_per_hour: fp.harshAccelsPerHour,
    std_safety_score: fp.stdSafetyScore,
    std_harsh_brakes: fp.stdHarshBrakes,
    updated_at: fp.updatedAt,
  };
}

function rowToFingerprint(row: FingerprintRow): CognitiveFingerprint {
  return {
    userId: row.user_id,
    tripCount: row.trip_count,
    avgSafetyScore: Number(row.avg_safety_score),
    avgPerclos: Number(row.avg_perclos),
    avgHHI: Number(row.avg_hhi),
    avgDistraction: Number(row.avg_distraction),
    harshBrakesPerHour: Number(row.harsh_brakes_per_hour),
    harshAccelsPerHour: Number(row.harsh_accels_per_hour),
    stdSafetyScore: Number(row.std_safety_score),
    stdHarshBrakes: Number(row.std_harsh_brakes),
    updatedAt: row.updated_at,
  };
}

export async function saveTrip(trip: TripRecord): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  const { error } = await getSupabase()
    .from('trips')
    .upsert(tripToRow(trip), { onConflict: 'id' });
  if (error) throw new Error(`Failed to save trip: ${error.message}`);
}

export async function getAllTrips(userId?: string): Promise<TripRecord[]> {
  const uid = requireUserId(userId);
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from('trips')
    .select('*')
    .eq('user_id', uid)
    .order('start_time', { ascending: false });

  if (error) throw new Error(`Failed to load trips: ${error.message}`);
  return (data as TripRow[]).map(rowToTrip);
}

export async function getTrip(id: string): Promise<TripRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getSupabase()
    .from('trips')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load trip: ${error.message}`);
  return data ? rowToTrip(data as TripRow) : null;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await getSupabase().from('trips').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete trip: ${error.message}`);
}

export async function saveBaseline(baseline: CognitiveFingerprint): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  const { error } = await getSupabase()
    .from('cognitive_fingerprints')
    .upsert(fingerprintToRow(baseline), { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to save baseline: ${error.message}`);
}

export async function getBaseline(userId?: string): Promise<CognitiveFingerprint | null> {
  const uid = requireUserId(userId);
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getSupabase()
    .from('cognitive_fingerprints')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  if (error) throw new Error(`Failed to load baseline: ${error.message}`);
  return data ? rowToFingerprint(data as FingerprintRow) : null;
}

export async function getProfile(userId: string): Promise<{ cogniId: string; displayName: string } | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('cogni_id, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return { cogniId: data.cogni_id, displayName: data.display_name ?? 'Driver' };
}

export async function exportTripsJson(userId?: string): Promise<string> {
  const uid = requireUserId(userId);
  const trips = await getAllTrips(uid);
  const baseline = await getBaseline(uid);
  const profile = await getProfile(uid);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    userId: uid,
    cogniId: profile?.cogniId,
    baseline,
    trips,
  }, null, 2);
}

export function downloadCogniLogs(userId?: string): Promise<void> {
  return exportTripsJson(userId).then(json => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognihood_logs_${userId ?? 'user'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
