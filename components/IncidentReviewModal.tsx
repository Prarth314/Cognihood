
import React from 'react';

interface IncidentReviewModalProps {
  record: any;
  onClose: () => void;
}

const IncidentReviewModal: React.FC<IncidentReviewModalProps> = ({ record, onClose }) => {
  const isBad = record.avgScore < 85;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl glass-panel rounded-[3rem] border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-full">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Reflective Replay</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 mono text-zinc-500 uppercase tracking-widest">#{record.id}</span>
            </div>
            <p className="text-xs mono text-zinc-500 uppercase tracking-widest font-bold">Post-Incident Cognitive Audit // {record.date}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:scale-110"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Visual Replay Mock */}
            <div className="space-y-6">
              <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 group">
                <img 
                  src={`https://picsum.photos/seed/${record.id}/800/450`} 
                  className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
                  alt="Incident Context"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/50 text-2xl group-hover:scale-110 transition-transform cursor-pointer">
                    <i className="fas fa-play"></i>
                  </div>
                </div>
                <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-lg text-[10px] mono text-red-500 font-black border-red-500/30">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  HAZARD_PEAK
                </div>
                <div className="absolute bottom-4 right-4 text-[9px] mono text-white/40">
                  REF_TIME: 14:22:04
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border-white/5">
                <h4 className="text-[10px] mono font-black text-zinc-500 uppercase tracking-widest mb-4">Metric Fluctuations</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Fatigue Marker', val: isBad ? 82 : 12, color: isBad ? 'text-red-500' : 'text-emerald-500' },
                    { label: 'Gaze Deviation', val: isBad ? 65 : 18, color: isBad ? 'text-amber-500' : 'text-emerald-500' },
                    { label: 'Cognitive Sync', val: isBad ? 41 : 94, color: isBad ? 'text-red-500' : 'text-emerald-500' },
                  ].map((m, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-400">{m.label}</span>
                      <span className={`text-xs mono font-black ${m.color}`}>{m.val}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Analysis & Learning */}
            <div className="flex flex-col gap-8">
              <div className={`p-6 rounded-3xl border ${isBad ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isBad ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    <i className={isBad ? 'fas fa-shield-virus' : 'fas fa-check-double'}></i>
                  </div>
                  <div>
                    <div className="text-[10px] mono text-zinc-500 uppercase font-black">Safety Conclusion</div>
                    <div className={`text-lg font-black uppercase italic ${isBad ? 'text-red-500' : 'text-emerald-500'}`}>
                      {isBad ? 'Compromised Alertness' : 'High Operational Sync'}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  {isBad 
                    ? "During this session, we detected a significant deviation from your cognitive fingerprint. Specific mechanical inputs suggest physical fatigue affecting reactionary precision."
                    : "Excellent consistency. Gaze patterns remained centered with healthy movement throughout the complex urban segments."}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] mono font-black text-sky-400 uppercase tracking-widest">Growth Plan: Style Adjustments</h4>
                <div className="space-y-3">
                  {[
                    { icon: 'fa-gauge-high', text: 'Brake Modulation: Practice slowing your brake pedal release. Identified jerky deceleration patterns suggest high pedal-velocity peaks.', active: true },
                    { icon: 'fa-bolt', text: 'Optimized Acceleration: Initiate faster acceleration during highway entry. Low-speed merges identified as a primary risk factor in this session.', active: true },
                    { icon: 'fa-eye', text: 'Perception Buffer: Extend blind spot wait duration by 0.5s. Your current gaze-shift is 12% faster than your identified safe baseline.', active: true },
                    { icon: 'fa-bed', text: 'Rest intervals: Every 45m recommended based on fatigue ramp.', active: isBad },
                  ].map((tip, i) => (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${tip.active ? 'bg-white/5 border-white/10 opacity-100' : 'opacity-30 border-transparent'}`}>
                      <i className={`fas ${tip.icon} mt-1 text-sky-400 w-5 text-center`}></i>
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">{tip.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto">
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Dismiss Audit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReviewModal;
