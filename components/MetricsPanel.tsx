
import React from 'react';
import { DriverMetrics } from '../types';

interface MetricsPanelProps {
  metrics: DriverMetrics;
}

const MetricRow: React.FC<{ label: string; value: string | number; unit?: string; percent?: number; color?: string }> = ({ label, value, unit, percent, color = "emerald-500" }) => (
  <div className="space-y-1.5 group">
    <div className="flex justify-between items-end">
      <span className="text-[9px] mono font-black text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">{label}</span>
      <span className="text-xs font-black text-white italic">{value}{unit}</span>
    </div>
    {percent !== undefined && (
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-${color} transition-all duration-1000 ease-out shadow-[0_0_8px_var(--glow-color)]`} 
          style={{ width: `${percent}%`, '--glow-color': percent > 80 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)' } as any}
        />
      </div>
    )}
  </div>
);

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  return (
    <div className="glass-panel rounded-[2rem] p-8 h-full flex flex-col gap-8 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
      
      <div className="flex justify-between items-start">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-3">
          <i className="fas fa-microchip text-xs"></i>
          Bio Telemetry
        </h3>
        <span className="text-[8px] mono text-zinc-700 font-black">SYNC_RT_99</span>
      </div>
      
      <div className="flex-1 flex flex-col gap-5">
        <MetricRow label="Eye Opening (EAR)" value={metrics.ear.toFixed(3)} percent={metrics.ear * 300} />
        <MetricRow label="Blink Frequency" value={metrics.blinkRate.toFixed(1)} unit="/min" percent={Math.min(100, metrics.blinkRate * 4)} />
        <MetricRow label="Closure Dur." value={metrics.closureDuration.toFixed(2)} unit="s" percent={Math.min(100, metrics.closureDuration * 40)} color={metrics.closureDuration > 1.5 ? "red-500" : "emerald-500"} />
        <MetricRow label="Stress Index" value={metrics.stressLevel} unit="%" percent={metrics.stressLevel} color={metrics.stressLevel > 70 ? "red-500" : "emerald-500"} />
        <MetricRow label="Distraction Prob" value={metrics.distractionLevel} unit="%" percent={metrics.distractionLevel} color={metrics.distractionLevel > 50 ? "amber-500" : "emerald-500"} />
      </div>

      <div className="mt-auto pt-8 border-t border-white/5 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[8px] mono text-zinc-600 font-bold uppercase mb-1">Pitch</div>
          <div className="text-[10px] font-black text-zinc-300 mono">{metrics.headPose.pitch.toFixed(1)}°</div>
        </div>
        <div className="text-center">
          <div className="text-[8px] mono text-zinc-600 font-bold uppercase mb-1">Yaw</div>
          <div className="text-[10px] font-black text-zinc-300 mono">{metrics.headPose.yaw.toFixed(1)}°</div>
        </div>
        <div className="text-center">
          <div className="text-[8px] mono text-zinc-600 font-bold uppercase mb-1">Roll</div>
          <div className="text-[10px] font-black text-zinc-300 mono">{metrics.headPose.roll.toFixed(1)}°</div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
