
import React, { useState } from 'react';
import IncidentReviewModal from './IncidentReviewModal';

const MOCK_RECORDS = [
  { id: 'TRIP_1029', date: 'MAY 12, 2025', duration: '42m', avgScore: 94, state: 'SAFE', distance: '12.4 mi', incidents: 0, cogLoad: 'LOW' },
  { id: 'TRIP_1028', date: 'MAY 11, 2025', duration: '1h 12m', avgScore: 82, state: 'WARNING', distance: '45.2 mi', incidents: 2, cogLoad: 'MED' },
  { id: 'TRIP_1027', date: 'MAY 10, 2025', duration: '28m', avgScore: 98, state: 'SAFE', distance: '8.1 mi', incidents: 0, cogLoad: 'LOW' },
  { id: 'TRIP_1026', date: 'MAY 10, 2025', duration: '15m', avgScore: 71, state: 'WARNING', distance: '4.2 mi', incidents: 1, cogLoad: 'HIGH' },
  { id: 'TRIP_1025', date: 'MAY 09, 2025', duration: '55m', avgScore: 91, state: 'SAFE', distance: '18.9 mi', incidents: 0, cogLoad: 'MED' },
  { id: 'TRIP_1024', date: 'MAY 08, 2025', duration: '2h 05m', avgScore: 88, state: 'SAFE', distance: '124.2 mi', incidents: 0, cogLoad: 'MED' },
];

const PastRecords: React.FC = () => {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-6">
      {/* Global Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex flex-col">
          <span className="text-[10px] mono text-zinc-500 font-black uppercase tracking-widest mb-2">Total Drive Time</span>
          <span className="text-3xl font-black text-white italic">24.5 HRS</span>
        </div>
        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex flex-col">
          <span className="text-[10px] mono text-zinc-500 font-black uppercase tracking-widest mb-2">Global Safety Rating</span>
          <span className="text-3xl font-black text-emerald-400 italic">92.1%</span>
        </div>
        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex flex-col">
          <span className="text-[10px] mono text-zinc-500 font-black uppercase tracking-widest mb-2">Fingerprint Deviations</span>
          <span className="text-3xl font-black text-amber-500 italic">0.02</span>
        </div>
        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex flex-col">
          <span className="text-[10px] mono text-zinc-500 font-black uppercase tracking-widest mb-2">V2X Safety Contrib</span>
          <span className="text-3xl font-black text-sky-400 italic">+14%</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 glass-panel rounded-[2.5rem] p-10 flex flex-col min-h-0 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <i className="fas fa-database text-[14rem]"></i>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] mono text-zinc-500 uppercase font-black tracking-widest">
                <th className="px-6 font-normal">Session ID</th>
                <th className="px-6 font-normal">Date & Time</th>
                <th className="px-6 font-normal">Metrics</th>
                <th className="px-6 font-normal">Safety Index</th>
                <th className="px-6 font-normal">Cog Load</th>
                <th className="px-6 font-normal text-right">Vault Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECORDS.map((rec) => (
                <tr 
                  key={rec.id} 
                  className="group cursor-pointer"
                  onClick={() => setSelectedRecord(rec)}
                >
                  <td className="px-6 py-6 bg-white/[0.02] border-y border-l border-white/5 rounded-l-2xl group-hover:bg-white/[0.05] transition-all">
                    <span className="text-sm mono font-black text-white group-hover:text-sky-400 transition-colors">#{rec.id}</span>
                  </td>
                  <td className="px-6 py-6 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-all">
                    <span className="text-sm font-bold text-zinc-300">{rec.date}</span>
                  </td>
                  <td className="px-6 py-6 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-all">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] mono text-zinc-500 uppercase font-black">{rec.duration} / {rec.distance}</span>
                      <span className={`text-[9px] font-bold uppercase ${rec.incidents > 0 ? 'text-amber-500/70' : 'text-zinc-600'}`}>
                        {rec.incidents} INCIDENTS RECORDED
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${rec.avgScore > 90 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : rec.avgScore > 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${rec.avgScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-black mono ${rec.avgScore > 90 ? 'text-emerald-500' : rec.avgScore > 75 ? 'text-amber-500' : 'text-red-500'}`}>
                        {rec.avgScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-all">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border mono font-black tracking-widest ${rec.cogLoad === 'LOW' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : rec.cogLoad === 'MED' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      {rec.cogLoad}
                    </span>
                  </td>
                  <td className="px-6 py-6 bg-white/[0.02] border-y border-r border-white/5 rounded-r-2xl group-hover:bg-white/[0.05] transition-all text-right">
                    <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] mono text-zinc-400 font-black group-hover:text-white group-hover:border-white/40 transition-all uppercase tracking-widest">
                      {rec.avgScore < 85 ? 'Review Audit' : 'Detail Report'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info for Archives */}
        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
          <div className="flex gap-4">
             <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
               <div className="h-2 w-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] mono text-emerald-500 font-black tracking-widest uppercase">System Baseline: NOMINAL</span>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-zinc-500 hover:text-white text-[10px] mono font-bold transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
              <i className="fas fa-file-pdf"></i> Export CogniLogs
            </button>
            <div className="h-6 w-px bg-white/5" />
            <div className="flex gap-2">
              <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all"><i className="fas fa-chevron-left"></i></button>
              <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500 text-black font-black text-xs">1</button>
              <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all">2</button>
              <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all"><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Review Modal (PIRR) */}
      {selectedRecord && (
        <IncidentReviewModal 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}
    </div>
  );
};

export default PastRecords;
