/** Offline annotated eye-closure evaluation. This does not measure driving safety. */
export interface ClosureObservation {
  session: string;
  timestampMs: number;
  referenceClosed: boolean | null;
  predictedClosed: boolean | null;
}
const ratio = (numerator: number, denominator: number) => denominator ? numerator / denominator : null;
export function evaluateClosure(rows: ClosureObservation[]) {
  const sessions = new Map<string, ClosureObservation[]>();
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row.session !== 'string' || !row.session || row.session.length > 200 ||
      !Number.isFinite(row.timestampMs) || row.timestampMs < 0 ||
      ![true, false, null].includes(row.referenceClosed) || ![true, false, null].includes(row.predictedClosed)) {
      throw new Error(`Invalid observation at row ${index + 1}`);
    }
    const session = sessions.get(row.session) ?? [];
    session.push(row); sessions.set(row.session, session);
  }
  let truePositive = 0, trueNegative = 0, falsePositive = 0, falseNegative = 0;
  let labelled = 0, abstained = 0, unlabelled = 0;
  let eligibleIntervalMs = 0, scoredIntervalMs = 0, excludedGapMs = 0, falseClosureMs = 0, observedSpanMs = 0;
  for (const session of sessions.values()) {
    session.sort((a, b) => a.timestampMs - b.timestampMs);
    observedSpanMs += session.length > 1 ? session.at(-1)!.timestampMs - session[0].timestampMs : 0;
    for (let index = 0; index < session.length; index++) {
      const row = session[index];
      if (index && row.timestampMs === session[index - 1].timestampMs) throw new Error('Duplicate timestamp within a session');
      if (row.referenceClosed === null) unlabelled++;
      else {
        labelled++;
        if (row.predictedClosed === null) abstained++;
        else if (row.predictedClosed && row.referenceClosed) truePositive++;
        else if (!row.predictedClosed && !row.referenceClosed) trueNegative++;
        else if (row.predictedClosed) falsePositive++;
        else falseNegative++;
      }
      if (!index) continue;
      const previous = session[index - 1];
      const delta = row.timestampMs - previous.timestampMs;
      if (delta > 500) { excludedGapMs += delta; continue; }
      // Time metrics require both endpoints annotated; do not bridge unknown labels.
      if (previous.referenceClosed === null || row.referenceClosed === null) continue;
      eligibleIntervalMs += delta;
      if (previous.predictedClosed === null || row.predictedClosed === null) continue;
      scoredIntervalMs += delta;
      if (!previous.referenceClosed && !row.referenceClosed && previous.predictedClosed && row.predictedClosed) falseClosureMs += delta;
    }
  }
  const scored = truePositive + trueNegative + falsePositive + falseNegative;
  return {
    schemaVersion: 1, sessions: sessions.size, observations: rows.length,
    labelled, unlabelled, abstained, scored,
    confusion: { truePositive, trueNegative, falsePositive, falseNegative },
    precision: ratio(truePositive, truePositive + falsePositive),
    recall: ratio(truePositive, truePositive + falseNegative),
    f1: ratio(2 * truePositive, 2 * truePositive + falsePositive + falseNegative),
    specificity: ratio(trueNegative, trueNegative + falsePositive),
    conditionalAgreement: ratio(truePositive + trueNegative, scored),
    labelledSampleCoverage: ratio(scored, labelled),
    observedSpanMs, eligibleIntervalMs, scoredIntervalMs, excludedGapMs, falseClosureMs,
    annotatedIntervalCoverage: ratio(scoredIntervalMs, eligibleIntervalMs),
  };
}
