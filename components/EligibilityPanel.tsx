import React from 'react';
import { EligibilityAssessment, TemporalAnalysis, EligibilityState } from '../types';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { cn } from '../lib/cn';

interface EligibilityPanelProps {
  eligibility: EligibilityAssessment | null;
  temporal: TemporalAnalysis | null;
}

const stateBadge: Record<EligibilityState, 'success' | 'primary' | 'warning' | 'error'> = {
  [EligibilityState.ELIGIBLE]: 'success',
  [EligibilityState.MONITORING]: 'primary',
  [EligibilityState.CAUTION]: 'warning',
  [EligibilityState.INELIGIBLE]: 'error',
};

const stateIcons: Record<EligibilityState, string> = {
  [EligibilityState.ELIGIBLE]: 'fa-circle-check',
  [EligibilityState.MONITORING]: 'fa-eye',
  [EligibilityState.CAUTION]: 'fa-triangle-exclamation',
  [EligibilityState.INELIGIBLE]: 'fa-ban',
};

const EligibilityPanel: React.FC<EligibilityPanelProps> = ({ eligibility, temporal }) => {
  const state = eligibility?.state ?? EligibilityState.MONITORING;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <i className={cn('fas text-sm text-[var(--primary)]', stateIcons[state])} aria-hidden="true" />
          <h3 className="ui-h3">Drive eligibility</h3>
        </div>
        <Badge tone={stateBadge[state]}>{state}</Badge>
      </div>

      <p className="ui-body">
        {eligibility?.primaryReason ?? 'Initializing temporal analysis buffer…'}
      </p>

      {eligibility && (
        <p className="ui-caption mono">
          {eligibility.durationInStateSec.toFixed(0)}s in state · {eligibility.confidence}% confidence
        </p>
      )}

      {eligibility && !eligibility.canDrive && (
        <div className="p-3 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/20" role="alert">
          <p className="text-sm font-medium text-[var(--error)]">Not eligible to continue driving</p>
        </div>
      )}

      {temporal && temporal.sampleCount > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
          {[
            { label: 'PERCLOS 30s', value: `${temporal.perclos30.toFixed(1)}%`, warn: temporal.perclos30 >= 15 },
            { label: 'Hypnosis index', value: temporal.highwayHypnosisIndex, warn: temporal.highwayHypnosisIndex >= 50 },
            { label: 'Gaze stagnation', value: `${temporal.gazeStagnation.toFixed(0)}%`, warn: false },
            { label: 'Monotony', value: `${temporal.monotonyDurationSec.toFixed(0)}s`, warn: false },
          ].map(item => (
            <div key={item.label}>
              <div className="ui-caption mb-0.5">{item.label}</div>
              <div className={cn('text-sm font-semibold', item.warn ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]')}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {eligibility && eligibility.signals.length > 1 && (
        <ul className="ui-caption space-y-1 list-disc list-inside">
          {eligibility.signals.slice(1, 4).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default EligibilityPanel;
