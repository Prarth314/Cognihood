import React from 'react';
import Card from './ui/Card';

interface ModuleSelectorProps {
  cogniId?: string | null;
  onStartTrip: () => void;
  onViewArchives: () => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ cogniId, onStartTrip, onViewArchives }) => (
  <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
    <div className="text-center space-y-2">
      {cogniId && <p className="ui-caption mono text-[var(--primary)]">{cogniId}</p>}
      <h1 className="ui-display">Welcome back</h1>
      <p className="ui-body">Choose a module to get started with driver safety monitoring.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button type="button" onClick={onStartTrip} className="text-left group">
        <Card className="h-full transition-shadow hover:shadow-md border-2 border-transparent hover:border-[var(--primary)]/30">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary-muted)] text-[var(--primary)] flex items-center justify-center mb-4">
            <i className="fas fa-gauge-high" aria-hidden="true" />
          </div>
          <h2 className="ui-h2 mb-2">Live monitoring</h2>
          <p className="ui-body">Real-time eligibility, hypnosis detection, and in-trip coaching.</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] mt-4 group-hover:gap-2 transition-all">
            Start pre-drive check <i className="fas fa-arrow-right text-xs" aria-hidden="true" />
          </span>
        </Card>
      </button>

      <button type="button" onClick={onViewArchives} className="text-left group">
        <Card className="h-full transition-shadow hover:shadow-md border-2 border-transparent hover:border-[var(--secondary)]/30">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] text-[var(--secondary)] flex items-center justify-center mb-4">
            <i className="fas fa-chart-line" aria-hidden="true" />
          </div>
          <h2 className="ui-h2 mb-2">Trip archives</h2>
          <p className="ui-body">Review past trips, coaching insights, and national benchmarks.</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--secondary)] mt-4 group-hover:gap-2 transition-all">
            View history <i className="fas fa-arrow-right text-xs" aria-hidden="true" />
          </span>
        </Card>
      </button>
    </div>
  </div>
);

export default ModuleSelector;
