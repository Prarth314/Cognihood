
import React from 'react';
import { NetworkEvent } from '../types';

interface Props {
  events: NetworkEvent[];
}

const NetworkAwareness: React.FC<Props> = ({ events }) => {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full border-indigo-500/20">
      <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2 mb-4">
        <i className="fas fa-satellite-dish text-xs animate-pulse"></i>
        Collective Awareness (CDAN)
      </h3>
      
      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-[10px] mono">
             <i className="fas fa-shield-halved text-2xl mb-2"></i>
             LOCAL_GRID_STABLE
          </div>
        ) : (
          events.map(ev => (
            <div key={ev.id} className={`p-3 rounded-xl border ${ev.severity > 70 ? 'bg-red-500/10 border-red-500/30' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-indigo-300 tracking-tighter uppercase">{ev.type.replace('_', ' ')}</span>
                <span className="text-[8px] mono text-indigo-500/60">ID: {ev.originId}</span>
              </div>
              <p className="text-[11px] leading-tight text-indigo-100/80">{ev.message}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-white/5 rounded-lg flex items-center justify-between">
         <div className="flex flex-col">
            <span className="text-[8px] mono text-gray-500 uppercase">Privacy Mask</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">ACTIVE (ANON_V2X)</span>
         </div>
         <i className="fas fa-fingerprint text-emerald-500/50"></i>
      </div>
    </div>
  );
};

export default NetworkAwareness;
