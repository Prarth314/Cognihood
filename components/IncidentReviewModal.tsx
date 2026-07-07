import React from 'react';
import { TripRecord } from '../types';
import { formatDuration, formatTripDate } from '../services/coachingService';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';

interface IncidentReviewModalProps {
  record: TripRecord;
  onClose: () => void;
}

const IncidentReviewModal: React.FC<IncidentReviewModalProps> = ({ record, onClose }) => {
  const isBad = record.avgScore < 85;

  return (
    <Modal
      open
      onClose={onClose}
      title="Trip report"
      description={`#${record.id} · ${formatTripDate(record.startTime)} · ${formatDuration(record.durationMs)}`}
      size="xl"
      footer={<Button variant="secondary" onClick={onClose}>Close report</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <h4 className="ui-h3 mb-4">Trip metrics</h4>
            <dl className="space-y-2 text-sm">
              {[
                ['Avg safety', record.avgScore],
                ['PERCLOS', `${record.avgPerclos.toFixed(1)}%`],
                ['Hypnosis index', record.avgHHI.toFixed(0)],
                ['Harsh brakes', record.harshBrakes],
                ['National percentile', record.nationalPercentile],
                ['Baseline deviation', record.fingerprintDeviation],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-4">
                  <dt className="text-[var(--text-secondary)]">{label}</dt>
                  <dd className="font-semibold mono">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {record.events.length > 0 && (
            <Card>
              <h4 className="ui-h3 mb-4">Events ({record.events.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {record.events.map(ev => (
                  <div key={ev.id} className="text-xs p-2 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]">
                    <Badge tone="neutral" className="mr-2">{ev.type}</Badge>
                    <span className="text-[var(--text-secondary)]">{ev.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div
            className={`p-5 rounded-lg border ${
              record.recklessFlag || isBad
                ? 'bg-[var(--error-muted)] border-[var(--error)]/20'
                : 'bg-[var(--success-muted)] border-[var(--success)]/20'
            }`}
          >
            <p className="text-sm font-semibold mb-2">
              {record.recklessFlag ? 'Atypical reckless pattern' : isBad ? 'Compromised alertness' : 'High operational sync'}
            </p>
            <p className="ui-body italic">{record.nationalComparison.summary}</p>
          </div>

          <div>
            <h4 className="ui-h3 mb-3">Growth plan</h4>
            <div className="space-y-2">
              {record.coachingTips.map(tip => (
                <Card key={tip.id} muted className="!p-4">
                  <div className="flex items-start gap-3">
                    <i className={`fas ${tip.icon} text-[var(--primary)] w-5`} aria-hidden="true" />
                    <div>
                      <div className="text-sm font-medium mb-1">{tip.title}</div>
                      <p className="ui-body">{tip.text}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default IncidentReviewModal;
