import React from 'react';
import { TripRecord } from '../types';

import Card from '../ui/Card';

interface TripTrendChartProps {
  trips: TripRecord[];
  maxBars?: number;
}

const TripTrendChart: React.FC<TripTrendChartProps> = ({ trips, maxBars = 12 }) => {
  const recent = [...trips]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, maxBars)
    .reverse();

  if (recent.length === 0) return null;

  const chartH = 120;
  const barW = Math.max(16, Math.min(40, 480 / recent.length - 8));
  const gap = 8;
  const width = recent.length * (barW + gap) + gap;
  const pad = { top: 8, bottom: 24, left: 32, right: 8 };
  const innerH = chartH - pad.top - pad.bottom;

  const scoreColor = (score: number) =>
    score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--warning)' : 'var(--error)';

  const avgSafety = recent.reduce((s, t) => s + t.avgScore, 0) / recent.length;
  const avgLineY = pad.top + innerH - (avgSafety / 100) * innerH;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="ui-h3">Safety trend</h3>
          <p className="ui-caption">Average score across your last {recent.length} trips</p>
        </div>
        <div className="text-2xl font-semibold" style={{ color: scoreColor(avgSafety) }}>
          {avgSafety.toFixed(0)}
          <span className="text-sm font-normal text-[var(--text-muted)]"> avg</span>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <svg
          width={width + pad.left + pad.right}
          height={chartH}
          role="img"
          aria-label={`Safety scores for last ${recent.length} trips`}
          className="min-w-full"
        >
          <line
            x1={pad.left}
            y1={avgLineY}
            x2={width + pad.left}
            y2={avgLineY}
            stroke="var(--border-strong)"
            strokeDasharray="4 4"
          />
          <text x={4} y={avgLineY + 4} className="fill-[var(--text-muted)]" fontSize="10">
            avg
          </text>

          {recent.map((trip, i) => {
            const x = pad.left + gap + i * (barW + gap);
            const h = (trip.avgScore / 100) * innerH;
            const y = pad.top + innerH - h;
            const label = new Date(trip.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            return (
              <g key={trip.id}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(2, h)}
                  rx={4}
                  fill={scoreColor(trip.avgScore)}
                  opacity={0.9}
                >
                  <title>{`${label}: ${trip.avgScore}% safety`}</title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={chartH - 6}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)]"
                  fontSize="9"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-[var(--border)]">
        <div>
          <p className="ui-caption">Best</p>
          <p className="text-sm font-semibold text-[var(--success)]">
            {Math.max(...recent.map(t => t.avgScore))}%
          </p>
        </div>
        <div>
          <p className="ui-caption">Incidents (total)</p>
          <p className="text-sm font-semibold">{recent.reduce((s, t) => s + t.incidents, 0)}</p>
        </div>
        <div>
          <p className="ui-caption">National % (avg)</p>
          <p className="text-sm font-semibold text-[var(--primary)]">
            {Math.round(recent.reduce((s, t) => s + t.nationalPercentile, 0) / recent.length)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default TripTrendChart;
