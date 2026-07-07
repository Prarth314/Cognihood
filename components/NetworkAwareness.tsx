import React from 'react';
import { NetworkEvent } from '../types';
import Card from './ui/Card';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';

interface Props {
  events: NetworkEvent[];
}

const NetworkAwareness: React.FC<Props> = ({ events }) => (
  <Card className="flex flex-col h-full gap-4 !p-0 overflow-hidden">
    <div className="p-5 pb-0">
      <h3 className="ui-h3 flex items-center gap-2">
        <i className="fas fa-satellite-dish text-[var(--secondary)]" aria-hidden="true" />
        Network awareness
      </h3>
      <p className="ui-caption mt-1">Simulated V2X collective awareness feed</p>
    </div>

    <div className="flex-1 min-h-0 px-5 overflow-y-auto custom-scrollbar space-y-2 pb-4">
      {events.length === 0 ? (
        <EmptyState
          icon="fa-shield-halved"
          title="Grid stable"
          description="No network events in the last interval. Nearby vehicles report normal conditions."
        />
      ) : (
        events.map(ev => (
          <div
            key={ev.id}
            className={`p-3 rounded-lg border ${
              ev.severity > 70
                ? 'bg-[var(--error-muted)] border-[var(--error)]/20'
                : 'bg-[var(--bg-muted)] border-[var(--border)]'
            }`}
          >
            <div className="flex justify-between items-center gap-2 mb-1">
              <Badge tone={ev.severity > 70 ? 'error' : 'neutral'}>
                {ev.type.replace(/_/g, ' ')}
              </Badge>
              <span className="ui-caption mono">{ev.originId}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{ev.message}</p>
          </div>
        ))
      )}
    </div>

    <div className="p-5 pt-0">
      <div className="p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-between">
        <div>
          <p className="ui-caption">Privacy mask</p>
          <p className="text-sm font-medium text-[var(--success)]">Active (anonymous V2X)</p>
        </div>
        <i className="fas fa-fingerprint text-[var(--text-muted)]" aria-hidden="true" />
      </div>
    </div>
  </Card>
);

export default NetworkAwareness;
