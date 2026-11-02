import { expect, it } from 'vitest';
import { evaluateStudy, matchEvents, type StudyRecording } from './studyEvaluation';
export const syntheticRecording = (): StudyRecording => ({
  recordingId: 'synthetic-01', participantGroup: 'synthetic-subject-01', sessionGroup: 'synthetic-session-01', split: 'development',
  provenance: { kind: 'synthetic', reference: 'Deterministic fixture; no recording or person', permissionReference: 'Repository MIT synthetic fixture' },
  capture: { device: 'synthetic', os: 'not applicable', browser: 'not applicable', width: 640, height: 480, fps: 10 },
  conditions: { lighting: 'normal', eyewear: 'none', pose: 'forward' },
  labels: { task: 'bilateral-eye-closure', definition: 'Scripted booleans; not human annotation', annotatorCodes: ['synthetic-generator'], adjudication: 'No human labels' },
  versions: { applicationCommit: '0'.repeat(40), sdk: 'synthetic', model: 'not run', algorithm: 'temporal-replay', configurationDigest: '0'.repeat(64) },
  observations: Array.from({ length: 31 }, (_, i) => ({ timestampMs: i * 100, referenceClosed: i < 11, predictedClosed: i === 30 ? null : i < 11, faceAvailable: i !== 30, headPose: { pitch: 0, yaw: 0, roll: 0 } })),
  observedIntervals: [{ startMs: 0, endMs: 3000 }], referenceEvents: [0], predictedEvents: [100, 2500],
});
it('matches events one-to-one without double counting and reports observed-time denominators', () => {
  const result = matchEvents([1000,1200], [1100,900,5000], 100, [{ startMs: 0, endMs: 6000 }]);
  expect(result.truePositive).toBe(2); expect(result.falsePositive).toBe(1); expect(result.falseNegative).toBe(0);
  expect(result.falseAlertsPerObservedHour).toBe(600); expect(result.signedOnsetDelayMs.count).toBe(2);
});
it('keeps unobserved events unscored and empty metrics unavailable', () => {
  const result = matchEvents([1000], [1100], 200, []);
  expect(result.unscoredReferenceEvents).toBe(1); expect(result.precision).toBeNull(); expect(result.falseAlertsPerObservedHour).toBeNull();
  expect(() => matchEvents([],[],100,[{startMs:0,endMs:10},{startMs:5,endMs:20}])).toThrow('overlapping');
});
it('replays real temporal code and marks all-synthetic metrics explicitly', () => {
  const result = evaluateStudy({ schemaVersion: 1, eventToleranceMs: 200, recordings: [syntheticRecording()] });
  expect(result.empiricalMetricsAvailable).toBe(false);
  expect(result.records[0].temporalReplay.firstMissingSampleCoverage).toBe(0);
  expect(result.records[0].events.recall).toBe(1);
  expect(JSON.stringify(result)).not.toContain('synthetic-subject-01');
});
it('rejects participant and session leakage into the held-out split', () => {
  const first = syntheticRecording(), second = { ...syntheticRecording(), recordingId: 'synthetic-02', split: 'held-out' as const };
  expect(() => evaluateStudy({ schemaVersion: 1, eventToleranceMs: 200, recordings: [first, second] })).toThrow('leakage');
});
