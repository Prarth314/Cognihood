
import React from 'react';
import { Poi, SafetyState } from '../types';
import { MOCK_POIS } from '../constants';

interface NavigationPanelProps {
  safetyState: SafetyState;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({ safetyState }) => {
  const isSafe = safetyState === SafetyState.SAFE;

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full">
      <h3 className="text-sm font-bold uppercase tracking-widest text-sky-400 flex items-center gap-2 mb-6">
        <i className="fas fa-map-location-dot text-xs"></i>
        Safe Stops & Rerouting
      </h3>

      {!isSafe ? (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
            <p className="text-xs text-red-200 leading-relaxed font-medium">
              CRITICAL: Cognitive load exceeding safety thresholds. Rerouting to nearest rest station recommended.
            </p>
          </div>
          
          {MOCK_POIS.map(poi => (
            <button key={poi.id} className="w-full text-left glass-panel p-4 rounded-xl hover:bg-white/5 transition-colors border-white/5 group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">{poi.name}</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded uppercase tracking-wider">{poi.type}</span>
              </div>
              <div className="flex justify-between text-[10px] mono text-gray-400">
                <span>{poi.distance}</span>
                <span>{poi.time}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
           <i className="fas fa-route text-4xl mb-4 text-gray-500"></i>
           <p className="text-xs mono tracking-wider">NAV_IDLE: NO ACTIVE REROUTE</p>
        </div>
      )}

      <div className="mt-6">
         <div className="aspect-video w-full bg-zinc-900 rounded-xl border border-white/10 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/400/225')] opacity-20 grayscale scale-110"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_10px_#0ea5e9] animate-ping" />
            </div>
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[8px] mono">
               MAP_OVR_LAX_12
            </div>
         </div>
      </div>
    </div>
  );
};

export default NavigationPanel;
