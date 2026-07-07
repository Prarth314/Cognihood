import React, { useState, useEffect, useCallback } from 'react';
import { TripRecord, AggregateStats } from '../types';
import { getAllTrips, getBaseline, downloadCogniLogs, saveBaseline } from '../services/tripStore';
import { computeFingerprint, computeAggregateStats } from '../services/baselineService';
import { formatDuration, formatTripDate } from '../services/coachingService';
import { useAuth } from '../contexts/AuthContext';
import { useTripsRealtime } from '../hooks/useTripsRealtime';
import TripTrendChart from './charts/TripTrendChart';
import MetricCard from './ui/MetricCard';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import { SkeletonCard } from './ui/Skeleton';
import IncidentReviewModal from './IncidentReviewModal';

const PastRecords: React.FC = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const all = await getAllTrips(user.id);
      const baseline = await getBaseline(user.id);
      const fp = computeFingerprint(all, user.id);
      if (fp) await saveBaseline(fp);
      setTrips(all);
      setStats(computeAggregateStats(all, fp));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useTripsRealtime(user?.id, load);

  if (!user) {
    return (
      <EmptyState
        icon="fa-user-lock"
        title="Sign in required"
        description="Sign in to view your trip archives and performance history."
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading trips">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-0">
      {error && (
        <div className="p-4 rounded-lg bg-[var(--error-muted)] border border-[var(--error)]/20 flex items-center justify-between gap-4" role="alert">
          <p className="text-sm text-[var(--error)]">{error}</p>
          <Button variant="secondary" size="sm" onClick={load}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total drive time" value={stats ? `${stats.totalDriveHours.toFixed(1)} hrs` : '0 hrs'} />
        <MetricCard label="Global safety rating" value={stats ? `${stats.globalSafetyRating.toFixed(1)}%` : '—'} tone="success" />
        <MetricCard label="Fingerprint deviations" value={stats ? stats.fingerprintDeviations.toFixed(2) : '0.00'} tone="warning" />
        <MetricCard
          label="National percentile (avg)"
          value={trips.length ? Math.round(trips.reduce((s, t) => s + t.nationalPercentile, 0) / trips.length) : '—'}
          tone="primary"
        />
      </div>

      {trips.length > 0 && <TripTrendChart trips={trips} />}

      <Card className="flex-1 flex flex-col min-h-0 !p-0 overflow-hidden">
        {trips.length === 0 ? (
          <EmptyState
            icon="fa-cloud"
            title="No trips yet"
            description="Complete a live monitoring session to sync your first trip to the cloud."
          />
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm" aria-label="Trip history">
              <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <tr className="ui-caption">
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Duration</th>
                  <th className="px-4 py-3 font-medium">Safety</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">National %</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Flags</th>
                  <th className="px-4 py-3 font-medium text-right">Report</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(rec => (
                  <tr
                    key={rec.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-muted)] cursor-pointer transition-colors"
                    onClick={() => setSelectedRecord(rec)}
                  >
                    <td className="px-4 py-4 mono font-medium">#{rec.id}</td>
                    <td className="px-4 py-4 hidden sm:table-cell">{formatTripDate(rec.startTime)}</td>
                    <td className="px-4 py-4 hidden md:table-cell ui-caption">
                      {formatDuration(rec.durationMs)} · {rec.distanceMi} mi
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-semibold mono ${rec.avgScore >= 85 ? 'text-[var(--success)]' : rec.avgScore >= 70 ? 'text-[var(--warning)]' : 'text-[var(--error)]'}`}>
                        {rec.avgScore}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell font-semibold text-[var(--primary)]">{rec.nationalPercentile}</td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {rec.recklessFlag && <Badge tone="error">Reckless</Badge>}
                        {rec.hypnosisEvents > 0 && <Badge tone="warning">Hypnosis</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedRecord(rec); }}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="ui-caption">{trips.length} trips · Cloud sync enabled</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              <i className="fas fa-rotate" aria-hidden="true" /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadCogniLogs(user.id)}>
              <i className="fas fa-file-export" aria-hidden="true" /> Export
            </Button>
          </div>
        </div>
      </Card>

      {selectedRecord && (
        <IncidentReviewModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};

export default PastRecords;
