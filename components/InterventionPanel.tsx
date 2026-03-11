
import React from 'react';
import { SafetyAssessment } from '../types';

const InterventionPanel: React.FC<{ assessment: SafetyAssessment | null }> = ({ assessment }) => {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col border-violet-500/20 h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Human Regulation (MAAT)</h3>
        <div className="flex gap-1">
           <div className="w-1 h-3 bg-violet-500/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
           <div className="w-1 h-5 bg-violet-500/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
           <div className="w-1 h-3 bg-violet-500/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      <div className="flex-1 bg-violet-500/5 rounded-xl border border-violet-500/10 p-4 flex flex-col justify-center gap-2">
        <div className="text-[10px] mono text-violet-400/60 uppercase">System Recommendation:</div>
        <p className="text-xs text-violet-100 italic">
          "{assessment?.intervention || "Optimizing cabin atmosphere for current cognitive state..."}"
        </p>
        
        <div className="mt-4 flex items-center gap-4">
           <button className="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 hover:scale-105 transition-transform">
              <i className="fas fa-play text-[10px]"></i>
           </button>
           <div className="flex-1 h-1 bg-violet-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 w-1/3 animate-[pulse_2s_infinite]"></div>
           </div>
        </div>
      </div>
      
      <div className="mt-3 flex justify-around text-[9px] mono text-gray-500">
         <span className="flex items-center gap-1"><i className="fas fa-lungs"></i> Guided Breath</span>
         <span className="flex items-center gap-1"><i className="fas fa-music"></i> Lo-Fi Focus</span>
         <span className="flex items-center gap-1"><i className="fas fa-thermometer-half"></i> 68°F Cabin</span>
      </div>
    </div>
  );
};

export default InterventionPanel;
