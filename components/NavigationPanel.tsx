import React, { useState } from 'react';
import { Poi, SafetyState } from '../types';
import { MOCK_POIS } from '../constants';
import Card from './ui/Card';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import { cn } from '../lib/cn';

interface NavigationPanelProps {
  safetyState: SafetyState;
  onReroute?: (poi: Poi) => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({ safetyState, onReroute }) => {
  const isSafe = safetyState === SafetyState.SAFE;
  const [selectedPoi, setSelectedPoi] = useState<string | null>(null);

  const handleSelect = (poi: Poi) => {
    setSelectedPoi(poi.id);
    onReroute?.(poi);
  };

  return (
    <Card className="flex flex-col h-full gap-4 !p-0 overflow-hidden">
      <div className="p-5 pb-0">
        <h3 className="ui-h3 flex items-center gap-2">
          <i className="fas fa-map-location-dot text-[var(--primary)]" aria-hidden="true" />
          Safe stops & rerouting
        </h3>
      </div>

      <div className="flex-1 min-h-0 px-5 overflow-y-auto custom-scrollbar">
        {!isSafe ? (
          <div className="space-y-3 pb-4">
            <div className="p-3 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/20">
              <p className="text-sm text-[#991b1b]">
                Cognitive load or alertness below threshold. Consider rerouting to a nearby rest stop.
              </p>
            </div>

            {MOCK_POIS.map(poi => (
              <button
                key={poi.id}
                type="button"
                onClick={() => handleSelect(poi)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border transition-colors',
                  selectedPoi === poi.id
                    ? 'border-[var(--primary)] bg-[var(--primary-muted)]'
                    : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)]'
                )}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-sm font-medium">{poi.name}</span>
                  <Badge tone="primary">{poi.type}</Badge>
                </div>
                <div className="flex justify-between ui-caption mono">
                  <span>{poi.distance} · CL {poi.cl_rating}</span>
                  <span>{poi.time}</span>
                </div>
                {selectedPoi === poi.id && (
                  <p className="ui-caption text-[var(--primary)] font-medium mt-2">Reroute active</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="fa-route"
            title="No active reroute"
            description="Your safety metrics are within normal range. Rerouting options appear when attention drops."
          />
        )}
      </div>

      <div className="p-5 pt-0">
        <div className="aspect-video w-full bg-[var(--bg-muted)] rounded-lg border border-[var(--border)] overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/400/225')] opacity-15 bg-cover" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full shadow-md" />
          </div>
          <div className="absolute bottom-2 left-2 bg-[var(--bg-surface)]/90 px-2 py-1 rounded ui-caption mono">
            {selectedPoi ? `Route ${selectedPoi}` : 'Map preview'}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NavigationPanel;
