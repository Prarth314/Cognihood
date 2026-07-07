import React from 'react';
import { TripRecord } from '../types';
import { formatDuration, formatTripDate } from '../services/coachingService';
import Modal from './ui/Modal';
import Button from './ui/Button';
import MetricCard from './ui/MetricCard';
import Badge from './ui/Badge';
import Card from './ui/Card';

interface TripSummaryModalProps {
  trip: TripRecord;
  onClose: () => void;
  onViewArchives: () => void;
}

const TripSummaryModal: React.FC<TripSummaryModalProps> = ({ trip, onClose, onViewArchives }) => {
  const wins = [
    trip.avgScore >= 85 && `Safety index averaged ${trip.avgScore}%`,
    trip.hypnosisEvents === 0 && 'No highway hypnosis events',
    trip.attentionFailures === 0 && 'All attention checks passed',
    trip.harshBrakes === 0 && 'No harsh braking detected',
  ].filter(Boolean) as string[];

  return (
    <Modal
      open
      onClose={onClose}
      title="Trip complete"
      description={`#${trip.id} · ${formatTripDate(trip.startTime)} · ${formatDuration(trip.durationMs)}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Dismiss</Button>
          <Button onClick={onViewArchives}>View archives</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Safety" value={trip.avgScore} tone={trip.avgScore >= 85 ? 'success' : 'warning'} />
          <MetricCard label="National %" value={trip.nationalPercentile} tone="primary" />
          <MetricCard label="Incidents" value={trip.incidents} />
          <MetricCard label="Deviation" value={trip.fingerprintDeviation} tone={trip.recklessFlag ? 'error' : 'default'} />
        </div>

        {trip.recklessFlag && (
          <div className="p-4 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/20" role="alert">
            <p className="text-sm text-[#991b1b]">
              <i className="fas fa-flag mr-2" aria-hidden="true" />
              Driving pattern was atypically reckless compared to your baseline and national norms.
            </p>
          </div>
        )}

        <div>
          <h4 className="ui-h3 mb-3">Wins</h4>
          <ul className="space-y-2">
            {wins.length > 0 ? wins.map((w, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                <i className="fas fa-check text-[var(--success)] mt-0.5" aria-hidden="true" /> {w}
              </li>
            )) : (
              <li className="ui-body">Complete more trips to unlock win tracking.</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="ui-h3 mb-3">Coaching tips</h4>
          <div className="space-y-2">
            {trip.coachingTips.map(tip => (
              <Card key={tip.id} muted className="!p-4">
                <div className="flex items-start gap-3">
                  <i className={`fas ${tip.icon} text-[var(--primary)] w-5 text-center mt-0.5`} aria-hidden="true" />
                  <div>
                    <div className="text-sm font-medium mb-1">{tip.title}</div>
                    <p className="ui-body">{tip.text}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card muted className="!p-4">
          <p className="ui-body italic">{trip.nationalComparison.summary}</p>
        </Card>
      </div>
    </Modal>
  );
};

export default TripSummaryModal;
