import { evaluateClosure, type ClosureObservation } from './facialEvaluation';
import { computeTemporalAnalysis } from './temporalAnalysis';
import type { LocalFaceSnapshot } from '../types';

export interface StudyRecording {
  recordingId: string; participantGroup: string; sessionGroup: string;
  split: 'development' | 'held-out';
  provenance: { kind: 'synthetic' | 'licensed' | 'consented'; reference: string; permissionReference: string };
  capture: { device: string; os: string; browser: string; width: number; height: number; fps: number };
  conditions: { lighting: 'normal' | 'dim' | 'backlit'; eyewear: 'none' | 'glasses' | 'sunglasses'; pose: 'forward' | 'varied' };
  labels: { task: 'bilateral-eye-closure'; definition: string; annotatorCodes: string[]; adjudication: string };
  versions: { applicationCommit: string; sdk: string; model: string; algorithm: string; configurationDigest: string };
  observations: Array<Omit<ClosureObservation, 'session'> & { faceAvailable: boolean; headPose: { pitch: number; yaw: number; roll: number } }>;
  observedIntervals: Array<{ startMs: number; endMs: number }>;
  referenceEvents: number[]; predictedEvents: number[];
}
export interface Study { schemaVersion: 1; eventToleranceMs: number; recordings: StudyRecording[] }
const requireValue = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
const fraction = (n: number, d: number) => d ? n / d : null;

export function matchEvents(reference: number[], predicted: number[], toleranceMs: number, intervals: StudyRecording['observedIntervals']) {
  requireValue(Array.isArray(reference) && Array.isArray(predicted) && reference.length <= 500 && predicted.length <= 500 && Array.isArray(intervals) && intervals.length <= 10000, 'Event/interval resource bound exceeded');
  requireValue(Number.isFinite(toleranceMs) && toleranceMs >= 0 && toleranceMs <= 10000, 'Invalid event tolerance');
  for (const times of [reference, predicted]) requireValue(times.every(time => Number.isFinite(time) && time >= 0) && new Set(times).size === times.length, 'Invalid or duplicate event times');
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < sorted.length; i++) requireValue(Number.isFinite(sorted[i].startMs) && Number.isFinite(sorted[i].endMs) && sorted[i].startMs >= 0 && sorted[i].endMs > sorted[i].startMs && (!i || sorted[i].startMs >= sorted[i - 1].endMs), 'Invalid or overlapping observed intervals');
  const observed = (time: number) => sorted.some(interval => time >= interval.startMs && time < interval.endMs);
  const refs = reference.filter(observed), preds = predicted.filter(observed);
  const owner = new Map<number, number>();
  const assign = (r: number, visited: Set<number>): boolean => {
    const candidates = preds.map((p, i) => ({ i, distance: Math.abs(p - refs[r]) }))
      .filter(item => item.distance <= toleranceMs && sorted.findIndex(interval => preds[item.i] >= interval.startMs && preds[item.i] < interval.endMs) === sorted.findIndex(interval => refs[r] >= interval.startMs && refs[r] < interval.endMs)).sort((a, b) => a.distance - b.distance || a.i - b.i);
    for (const { i } of candidates) {
      if (visited.has(i)) continue; visited.add(i);
      if (!owner.has(i) || assign(owner.get(i)!, visited)) { owner.set(i, r); return true; }
    }
    return false;
  };
  refs.forEach((_, r) => assign(r, new Set()));
  const delays = [...owner].map(([p, r]) => preds[p] - refs[r]).sort((a, b) => a - b);
  const observedMs = sorted.reduce((sum, interval) => sum + interval.endMs - interval.startMs, 0);
  const tp = owner.size, fp = preds.length - tp, fn = refs.length - tp;
  const percentile = (p: number) => delays.length ? delays[Math.ceil(p * delays.length) - 1] : null;
  return { referenceEvents: refs.length, predictedEvents: preds.length, truePositive: tp, falsePositive: fp, falseNegative: fn,
    unscoredReferenceEvents: reference.length - refs.length, unscoredPredictedEvents: predicted.length - preds.length,
    toleranceMs, observedMs, precision: fraction(tp, tp + fp), recall: fraction(tp, tp + fn),
    falseAlertsPerObservedHour: observedMs ? fp * 3600000 / observedMs : null,
    signedOnsetDelayMs: { count: delays.length, p50: percentile(.5), p95: percentile(.95) } };
}

export function evaluateStudy(study: Study) {
  requireValue(study?.schemaVersion === 1 && Array.isArray(study.recordings) && study.recordings.length > 0 && study.recordings.length <= 100, 'Invalid study manifest');
  const ids = new Set<string>(); const subjects = new Map<string, string>(); const sessions = new Map<string, string>();
  const records = study.recordings.map((record, ordinal) => {
    requireValue(text(record.recordingId) && !ids.has(record.recordingId), 'Missing or duplicate recording identifier'); ids.add(record.recordingId);
    requireValue(['development', 'held-out'].includes(record.split), 'Invalid split');
    for (const [map, key] of [[subjects, record.participantGroup], [sessions, record.sessionGroup]] as const) {
      requireValue(text(key), 'Missing split group'); requireValue(!map.has(key) || map.get(key) === record.split, 'Participant/session leakage across study splits'); map.set(key, record.split);
    }
    requireValue(['synthetic', 'licensed', 'consented'].includes(record.provenance?.kind) && text(record.provenance.reference) && text(record.provenance.permissionReference), 'Missing provenance or permission record');
    requireValue(record.capture && ['device', 'os', 'browser'].every(key => text(record.capture[key as 'device'])) && [record.capture.width, record.capture.height, record.capture.fps].every(value => Number.isFinite(value) && value > 0), 'Missing capture metadata');
    requireValue(record.labels?.task === 'bilateral-eye-closure' && text(record.labels.definition) && record.labels.annotatorCodes?.length > 0 && record.labels.annotatorCodes.every(text) && text(record.labels.adjudication), 'Missing label protocol');
    requireValue(record.versions && /^[a-f0-9]{40}$/i.test(record.versions.applicationCommit) && /^[a-f0-9]{64}$/i.test(record.versions.configurationDigest) && ['sdk', 'model', 'algorithm'].every(key => text(record.versions[key as 'sdk'])), 'Missing version/configuration identity');
    requireValue(record.conditions && ['normal', 'dim', 'backlit'].includes(record.conditions.lighting) && ['none', 'glasses', 'sunglasses'].includes(record.conditions.eyewear) && ['forward', 'varied'].includes(record.conditions.pose), 'Invalid recorded conditions');
    requireValue(Array.isArray(record.observations) && record.observations.length <= 100000, 'Invalid observation count');
    const rows = record.observations.map(row => ({ ...row, session: record.recordingId }));
    const closure = evaluateClosure(rows);
    const snapshots: LocalFaceSnapshot[] = [...record.observations].sort((a,b) => a.timestampMs-b.timestampMs).map(row => {
      requireValue(typeof row.faceAvailable === 'boolean' && row.headPose && [row.headPose.pitch, row.headPose.yaw, row.headPose.roll].every(Number.isFinite), 'Invalid replay pose/availability');
      return { timestamp: row.timestampMs, faceDetected: row.faceAvailable && row.predictedClosed !== null, ear: row.predictedClosed ? .1 : .3,
        eyesClosed: row.predictedClosed === true, blinkDetected: false, headPose: row.headPose };
    });
    // Replay the actual temporal implementation, not a second copy of its formulas.
    let lastAnalysis = -Infinity, analyses = 0, missingCoverage: number | null = null;
    let lastClosure: number | null = null; let buffer: LocalFaceSnapshot[] = [];
    for (let index = 0; index < snapshots.length; index++) {
      const sample = snapshots[index];
      buffer.push(sample); buffer = buffer.filter(row => row.timestamp >= sample.timestamp - 60000).slice(-2400);
      const firstMissing = index > 0 && !sample.faceDetected && snapshots[index - 1].faceDetected;
      if (!firstMissing && index !== snapshots.length - 1 && sample.timestamp - lastAnalysis < 500) continue;
      const temporal = computeTemporalAnalysis(buffer, undefined, sample.timestamp);
      analyses++; lastAnalysis = sample.timestamp; lastClosure = temporal.perclos30;
      if (firstMissing && missingCoverage === null) missingCoverage = temporal.faceDetectionRate;
    }
    return { ordinal, split: record.split, synthetic: record.provenance.kind === 'synthetic', conditions: record.conditions,
      closure, events: matchEvents(record.referenceEvents, record.predictedEvents, study.eventToleranceMs, record.observedIntervals),
      temporalReplay: { inputSamples: snapshots.length, analyses, lastClosureProxy: lastClosure,
        firstMissingSampleCoverage: missingCoverage } };
  });
  return { schemaVersion: 1, empiricalMetricsAvailable: records.some(record => !record.synthetic && record.closure.labelled > 0),
    scope: 'Annotated closure/event decisions and temporal replay; no landmark detection or driving-safety accuracy.',
    conditionsAreDescriptiveOnly: true, records };
}
