import React from 'react';
import { DriverMetrics, TemporalAnalysis } from '../types';
import Card from './ui/Card';
import { cn } from '../lib/cn';

interface MetricsPanelProps {
  metrics: DriverMetrics;
  temporal?: TemporalAnalysis | null;
}

const barColor = (percent: number, warnAt = 70) =>
  percent >= warnAt ? 'var(--error)' : percent >= 50 ? 'var(--warning)' : 'var(--primary)';

const MetricRow: React.FC<{
  label: string;
  value: string | number;
  unit?: string;
  percent?: number;
  warnAt?: number;
}> = ({ label, value, unit, percent, warnAt }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center gap-2">
      <span className="ui-caption font-medium">{label}</span>
      <span className="text-sm font-semibold mono">{value}{unit}</span>
    </div>
    {percent !== undefined && (
      <div className="ui-progress">
        <div
          className="ui-progress-bar"
          style={{ width: `${Math.min(100, percent)}%`, background: barColor(percent, warnAt) }}
        />
      </div>
    )}
  </div>
);

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, temporal }) => (
  <Card className="flex flex-col gap-5">
    <div className="flex items-center justify-between">
      <h3 className="ui-h3 flex items-center gap-2">
        <i className="fas fa-heart-pulse text-[var(--primary)]" aria-hidden="true" />
        Bio telemetry
      </h3>
      <span className="ui-caption mono">Live</span>
    </div>

    <div className="flex flex-col gap-4">
      {temporal && temporal.sampleCount > 0 && (
        <>
          <MetricRow
            label="PERCLOS (30s)"
            value={temporal.perclos30.toFixed(1)}
            unit="%"
            percent={Math.min(100, temporal.perclos30 * 2)}
            warnAt={30}
          />
          <MetricRow
            label="Blink rate (local)"
            value={temporal.blinkRatePerMin.toFixed(1)}
            unit="/min"
            percent={Math.min(100, temporal.blinkRatePerMin * 4)}
          />
        </>
      )}
      <MetricRow label="Eye opening (EAR)" value={metrics.ear.toFixed(3)} percent={metrics.ear * 300} />
      <MetricRow label="Blink frequency" value={metrics.blinkRate.toFixed(1)} unit="/min" percent={Math.min(100, metrics.blinkRate * 4)} />
      <MetricRow label="Closure duration" value={metrics.closureDuration.toFixed(2)} unit="s" percent={Math.min(100, metrics.closureDuration * 40)} warnAt={60} />
      <MetricRow label="Stress index" value={metrics.stressLevel} unit="%" percent={metrics.stressLevel} warnAt={70} />
      <MetricRow label="Distraction" value={metrics.distractionLevel} unit="%" percent={metrics.distractionLevel} warnAt={50} />
    </div>

    <div className="pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-2">
      {(['pitch', 'yaw', 'roll'] as const).map(axis => (
        <div key={axis} className="text-center">
          <div className="ui-caption capitalize">{axis}</div>
          <div className="text-sm font-semibold mono">{metrics.headPose[axis].toFixed(1)}°</div>
        </div>
      ))}
    </div>
  </Card>
);

export default MetricsPanel;
