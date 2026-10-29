import React from 'react';
import Card from './ui/Card';

interface ModuleSelectorProps {
  cogniId?: string | null;
  onStartTrip: () => void;
  onViewArchives: () => void;
  onDeleteAccount: () => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ cogniId, onStartTrip, onViewArchives, onDeleteAccount }) => (
  <div className="workspace-overview flex flex-col gap-8 max-w-5xl mx-auto w-full">
    <div className="workspace-welcome space-y-2">
      <p className="eyebrow-new">Your attention-support workspace</p>
      {cogniId && <p className="ui-caption mono text-[var(--primary)]">{cogniId}</p>}
      <h1 className="ui-display">A clearer view<br />of your next session.</h1>
      <p className="ui-body">Choose a module for attention-support monitoring. CogniHood does not determine fitness to drive.</p>
    </div>
    <div className="workspace-session-note"><span className="status-dot" /><span><strong>Start while safely parked.</strong> Camera access stays off until you review the notice and give consent.</span></div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button type="button" onClick={onStartTrip} className="text-left group">
        <Card className="h-full transition-shadow hover:shadow-md border-2 border-transparent hover:border-[var(--primary)]/30">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary-muted)] text-[var(--primary)] flex items-center justify-center mb-4">
            <i className="fas fa-gauge-high" aria-hidden="true" />
          </div>
          <p className="eyebrow-new">01 / Prepare & observe</p>
          <h2 className="ui-h2 mb-2">Start a session</h2>
          <p className="ui-body">Camera-derived attention indicators and non-vehicle-control coaching.</p>
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
          <p className="eyebrow-new">02 / Review & reflect</p>
          <h2 className="ui-h2 mb-2">Your trip archives</h2>
          <p className="ui-body">Review past sessions, coaching notes, and prototype reference comparisons.</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--secondary)] mt-4 group-hover:gap-2 transition-all">
            View history <i className="fas fa-arrow-right text-xs" aria-hidden="true" />
          </span>
        </Card>
      </button>
    </div>
    <div className="text-center space-y-2">
      <p className="ui-caption">Account data can be exported from Trip archives.</p>
      <button type="button" className="text-sm text-[var(--error)] underline underline-offset-4" onClick={onDeleteAccount}>
        Permanently delete my account and cloud data
      </button>
    </div>
  </div>
);

export default ModuleSelector;
