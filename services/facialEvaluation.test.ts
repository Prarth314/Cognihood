import { expect, it } from 'vitest';
import { evaluateClosure, type ClosureObservation } from './facialEvaluation';
const row = (timestampMs: number, referenceClosed: boolean | null, predictedClosed: boolean | null, session = 'synthetic'): ClosureObservation => ({ session, timestampMs, referenceClosed, predictedClosed });
it('reports classification errors separately from missing predictions and missing labels', () => {
  const result = evaluateClosure([row(0, true, true), row(100, false, false), row(200, false, true), row(300, true, false), row(400, true, null), row(500, null, true)]);
  expect(result.confusion).toEqual({ truePositive: 1, trueNegative: 1, falsePositive: 1, falseNegative: 1 });
  expect(result.precision).toBe(.5); expect(result.recall).toBe(.5); expect(result.f1).toBe(.5);
  expect(result.conditionalAgreement).toBe(.5); expect(result.labelledSampleCoverage).toBe(.8);
  expect(result.unlabelled).toBe(1); expect(result.abstained).toBe(1);
});
it('excludes large gaps and never joins independent sessions', () => {
  const result = evaluateClosure([row(0, false, true), row(500, false, true), row(1500, false, true), row(1600, false, null), row(0, false, true, 'other')]);
  expect(result.falseClosureMs).toBe(500); expect(result.excludedGapMs).toBe(1000);
  expect(result.eligibleIntervalMs).toBe(600); expect(result.scoredIntervalMs).toBe(500);
});
it('returns unavailable metrics rather than invented perfect accuracy for empty/unknown data', () => {
  expect(evaluateClosure([]).conditionalAgreement).toBeNull();
  const result = evaluateClosure([row(0, null, null)]);
  expect(result.recall).toBeNull(); expect(result.labelledSampleCoverage).toBeNull();
});
it('rejects malformed and duplicate evidence instead of silently changing the denominator', () => {
  expect(() => evaluateClosure([row(NaN, true, true)])).toThrow('Invalid observation');
  expect(() => evaluateClosure([row(0, true, true), row(0, false, false)])).toThrow('Duplicate timestamp');
});
