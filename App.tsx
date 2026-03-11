
import React, { useState, useCallback, useEffect } from 'react';
import CameraPreview from './components/CameraPreview';
import MetricsPanel from './components/MetricsPanel';
import NavigationPanel from './components/NavigationPanel';
import NetworkAwareness from './components/NetworkAwareness';
import InterventionPanel from './components/InterventionPanel';
import PastRecords from './components/PastRecords';
import { SafetyAssessment, SafetyState, NetworkEvent } from './types';
import { analyzeDrivingEnvironment } from './services/geminiService';

type View = 'landing' | 'selector' | 'dashboard' | 'records';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [assessment, setAssessment] = useState<SafetyAssessment | null>(null);
  const [history, setHistory] = useState<SafetyAssessment[]>([]);
  const [networkEvents, setNetworkEvents] = useState<NetworkEvent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // CDAN Real-time simulation
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const types: NetworkEvent['type'][] = ['FATIGUE_BEACON', 'EMERGENCY_CORRIDOR', 'GHOST_OBJECT', 'DE_ESCALATION'];
        const type = types[Math.floor(Math.random() * types.length)];
        const newEvent: NetworkEvent = {
          id: `ev_${Date.now()}`,
          type,
          originId: `V_${Math.floor(Math.random() * 999)}`,
          location: { lat: 34.05, lng: -118.24 },
          severity: Math.random() * 100,
          message: type === 'EMERGENCY_CORRIDOR' ? 'Ambulance path detected 1.2km behind.' : 
                   type === 'FATIGUE_BEACON' ? 'Preceding vehicle shows high instability markers.' :
                   type === 'GHOST_OBJECT' ? 'Hazard detected by lead vehicle in blind corner.' :
                   'Overtake signal received: Neutral intent.'
        };
        setNetworkEvents(prev => [newEvent, ...prev].slice(0, 5));
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [currentView]);

  const handleFrame = useCallback(async (base64: string) => {
    if (isAnalyzing || currentView !== 'dashboard') return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeDrivingEnvironment(base64, history);
      setAssessment(result);
      setHistory(prev => [...prev.slice(-20), result]);
    } catch (err) {
      console.error("Frame analysis error", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, history, currentView]);

  const stateTheme = {
    [SafetyState.SAFE]: { color: 'text-emerald-500', border: 'border-emerald-500', bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
    [SafetyState.WARNING]: { color: 'text-amber-500', border: 'border-amber-500', bg: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
    [SafetyState.CRITICAL]: { color: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500', shadow: 'shadow-red-500/20' },
    [SafetyState.OVERRIDE]: { color: 'text-purple-500', border: 'border-purple-500', bg: 'bg-purple-500', shadow: 'shadow-purple-500/20' },
  };

  const currentTheme = assessment ? stateTheme[assessment.state] : stateTheme[SafetyState.SAFE];

  const LandingView = () => (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mb-12 relative animate-float">
        <div className="w-28 h-28 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center text-emerald-500 text-5xl shadow-[0_0_60px_rgba(16,185,129,0.2)] glass-panel">
          <i className="fas fa-eye-low-vision"></i>
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-black border-4 border-[#020202]">
           <i className="fas fa-check text-xs"></i>
        </div>
      </div>

      <div className="text-center z-10 max-w-2xl">
        <h1 className="text-7xl font-extrabold tracking-tighter uppercase italic mb-4 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
          CogniHood
        </h1>
        <p className="text-emerald-500/60 mono tracking-[0.3em] uppercase text-xs font-bold mb-16">
          Human-Centered Predictive Mobility
        </p>

        <div className="glass-panel p-10 rounded-[2.5rem] w-full max-w-md mx-auto border-white/5 shadow-2xl relative">
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
          
          <h2 className="text-lg font-bold mb-8 text-white flex items-center justify-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Terminal Authentication
          </h2>
          
          <div className="space-y-6 mb-10">
            <div className="text-left">
              <label className="text-[10px] mono text-zinc-500 uppercase font-bold tracking-widest ml-1 mb-2 block">CogniID Tag</label>
              <div className="relative group">
                <i className="fas fa-fingerprint absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors"></i>
                <input type="text" readOnly value="COG_USR_8829_PX" className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm mono text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all cursor-default" />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[10px] mono text-zinc-500 uppercase font-bold tracking-widest ml-1 mb-2 block">Privacy Mask</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between">
                <span className="text-[10px] mono text-emerald-500 font-bold">SHA-256 ACTIVE</span>
                <i className="fas fa-shield-halved text-emerald-500/30"></i>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setCurrentView('selector')}
            className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-emerald-400 hover:text-black transition-all shadow-xl shadow-white/5 uppercase tracking-widest text-sm active:scale-[0.98]"
          >
            Access Intelligence
          </button>
        </div>
      </div>

      <div className="mt-16 flex gap-12 text-[10px] mono text-zinc-600 tracking-widest font-bold opacity-40">
        <span>V2X_CORE: LINKED</span>
        <span>HVAL_ADAPT: 2.1</span>
        <span>BIOMETRICS: READY</span>
      </div>
    </div>
  );

  const SelectorView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-16 relative">
      <div className="text-center z-10">
        <div className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] mono text-emerald-400 font-bold uppercase tracking-[0.2em] mb-6">
          System Initialized // Verified
        </div>
        <h2 className="text-4xl font-extrabold uppercase italic mb-4 text-white">Select Core Module</h2>
        <p className="text-zinc-500 text-sm max-w-md mx-auto">CogniHood adapts to your needs. Choose between real-time cognitive assistance or detailed performance archives.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl z-10 px-4">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="group glass-panel p-10 rounded-[3rem] border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all text-left relative overflow-hidden h-96 flex flex-col justify-end"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:-translate-y-2 group-hover:translate-x-2 transition-all duration-700">
            <i className="fas fa-bolt-lightning text-[12rem] text-emerald-500"></i>
          </div>
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-3xl mb-auto">
            <i className="fas fa-wave-square"></i>
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase italic mb-3 text-white">Live Vitals</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-xs">AI-driven cabin vision monitoring fatigue, stress, and predictive hazard alerts in real-time.</p>
            <div className="flex items-center gap-3 text-emerald-500 text-[11px] mono font-bold uppercase tracking-[0.2em]">
              Launch Stream <i className="fas fa-chevron-right ml-1 group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setCurrentView('records')}
          className="group glass-panel p-10 rounded-[3rem] border-sky-500/10 hover:border-sky-500/40 hover:bg-sky-500/[0.03] transition-all text-left relative overflow-hidden h-96 flex flex-col justify-end"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:-translate-y-2 group-hover:translate-x-2 transition-all duration-700">
            <i className="fas fa-folder-tree text-[12rem] text-sky-500"></i>
          </div>
          <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500 text-3xl mb-auto">
            <i className="fas fa-chart-line"></i>
          </div>
          <div>
            <h3 className="text-3xl font-black uppercase italic mb-3 text-white">Performance</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-xs">Historical trend analysis, cognitive fingerprinting, and post-incident reflective replays.</p>
            <div className="flex items-center gap-3 text-sky-500 text-[11px] mono font-bold uppercase tracking-[0.2em]">
              Access Archives <i className="fas fa-chevron-right ml-1 group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>
        </button>
      </div>

      <button onClick={() => setCurrentView('landing')} className="text-zinc-600 hover:text-zinc-400 text-[10px] mono uppercase font-bold tracking-[0.3em] transition-colors group">
        <i className="fas fa-power-off mr-2 group-hover:text-red-500"></i> Terminate Neural Link
      </button>
    </div>
  );

  const DashboardView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex justify-between items-center mb-6">
        <div className="flex gap-5 items-center">
           <button onClick={() => setCurrentView('selector')} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <i className="fas fa-arrow-left text-sm"></i>
           </button>
           <div className={`w-14 h-14 rounded-2xl ${currentTheme.bg}/10 border border-${currentTheme.border}/30 flex items-center justify-center ${currentTheme.color} text-2xl shadow-lg`}>
              <i className="fas fa-brain"></i>
           </div>
           <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white leading-none mb-1">CogniHood <span className={currentTheme.color}>IntelliDrive</span></h1>
              <div className="flex gap-4 text-[9px] mono text-gray-500 font-bold">
                 <span className="flex items-center gap-1"><i className="fas fa-user-shield text-emerald-500/50"></i> AUTH: BIOMETRIC_PASSED</span>
                 <span className="flex items-center gap-1 uppercase tracking-widest text-emerald-500/60 font-black"><i className="fas fa-network-wired"></i> CDAN: CONNECTED</span>
              </div>
           </div>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={() => setAccessibilityMode(!accessibilityMode)}
             className={`px-6 py-2.5 rounded-2xl border text-[10px] mono uppercase font-bold transition-all flex items-center gap-3 ${accessibilityMode ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'}`}>
             <i className="fas fa-universal-access"></i>
             {accessibilityMode ? 'HVAL: ENABLED' : 'HVAL: ADAPTIVE'}
           </button>
           <div className="glass-panel px-6 py-2 rounded-2xl text-right flex flex-col justify-center">
              <span className="text-[9px] mono text-zinc-500 block uppercase font-bold tracking-widest mb-0.5">Vitals Stability</span>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-black text-white italic">HIGH</span>
                <div className={`h-1.5 w-1.5 rounded-full ${currentTheme.bg} pulse-emerald`} />
              </div>
           </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-3 flex flex-col gap-6">
           <MetricsPanel metrics={assessment?.metrics || { ear: 0.3, blinkRate: 12, closureDuration: 0.1, headPose: { pitch: 0, yaw: 0, roll: 0 }, stressLevel: 0, distractionLevel: 0, cognitiveLoad: 8 }} />
           <div className="h-full">
            <InterventionPanel assessment={assessment} />
           </div>
        </div>

        <div className="col-span-6 flex flex-col gap-6 relative">
          <div className="flex-1 relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-black/40 shadow-inner group">
             <CameraPreview 
               isActive={true} 
               onFrame={handleFrame} 
               stateColor={currentTheme.border} 
             />
             
             {/* HUD Statistics Overlays */}
             <div className="absolute top-10 left-10 flex flex-col gap-6 pointer-events-none">
                <div className="glass-panel p-4 rounded-3xl border-white/10">
                   <div className="text-[10px] mono text-white/30 uppercase font-black tracking-widest mb-1">Safety Index</div>
                   <div className={`text-6xl font-black italic tracking-tighter ${currentTheme.color} transition-colors duration-1000 flex items-baseline gap-2`}>
                    {assessment?.score.toFixed(0) || '100'}
                    <span className="text-xs not-italic font-bold opacity-30">%</span>
                   </div>
                </div>
             </div>

             <div className="absolute top-10 right-10 text-right pointer-events-none">
               <div className="glass-panel p-4 rounded-3xl border-white/10">
                <div className="text-[10px] mono text-white/30 uppercase font-black tracking-widest mb-1">Cognitive Load</div>
                <div className="text-4xl font-black italic text-sky-400">
                  {assessment?.metrics.cognitiveLoad || 0}%
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${assessment?.metrics.cognitiveLoad || 0}%` }} />
                </div>
               </div>
             </div>

             {isAnalyzing && (
               <div className="absolute bottom-10 left-1/2 -translate-x-1/2 glass-panel px-6 py-2.5 rounded-full flex items-center gap-4 border-emerald-500/30">
                  <div className="flex gap-1.5">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" />
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] mono text-emerald-400 font-black uppercase tracking-widest">Processing Vision Stream</span>
               </div>
             )}
          </div>

          <div className={`glass-panel p-6 rounded-[2rem] border-l-8 border-${currentTheme.border.split('-')[1]}-500/50 shadow-lg relative overflow-hidden`}>
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <i className={`fas ${assessment?.state === SafetyState.CRITICAL ? 'fa-triangle-exclamation' : 'fa-brain'} text-4xl`}></i>
             </div>
             <h4 className={`text-[10px] mono font-black uppercase tracking-widest mb-2 ${currentTheme.color.replace('text-', 'text-opacity-60 ')}`}>System Reasoning Output</h4>
             <p className="text-sm text-zinc-100 leading-relaxed font-medium italic">
                {assessment?.explanation || "Awaiting high-fidelity telemetry... Establishing visual baseline and environment context."}
             </p>
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-6">
           <div className="h-3/5">
              <NavigationPanel safetyState={assessment?.state || SafetyState.SAFE} />
           </div>
           <div className="h-2/5">
              <NetworkAwareness events={networkEvents} />
           </div>
        </div>
      </main>

      {assessment?.state === SafetyState.CRITICAL && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-12">
           <div className="bg-red-600/90 backdrop-blur-xl text-white px-16 py-10 rounded-[3rem] animate-pulse shadow-[0_0_100px_rgba(239,68,68,0.4)] border-4 border-white/20 text-center">
              <div className="mb-4 text-5xl">
                <i className="fas fa-skull-crossbones"></i>
              </div>
              <h2 className="text-5xl font-black uppercase mb-2 italic tracking-tighter">Critical Intervention</h2>
              <p className="mono text-xs tracking-[0.4em] uppercase font-bold text-white/70">Initiating Graduated Autonomy Protocol</p>
           </div>
           <div className="absolute inset-0 border-[60px] border-red-500/20 pulse-red" />
        </div>
      )}
    </div>
  );

  return (
    <div className={`h-screen w-screen bg-[#020202] p-8 flex flex-col overflow-hidden transition-all duration-1000 ${accessibilityMode ? 'contrast-125 saturate-150' : ''}`}>
      {currentView === 'landing' && <LandingView />}
      {currentView === 'selector' && <SelectorView />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'records' && (
        <div className="flex-1 flex flex-col min-h-0">
          <header className="flex justify-between items-center mb-8">
            <div className="flex gap-6 items-center">
              <button onClick={() => setCurrentView('selector')} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                <i className="fas fa-chevron-left"></i>
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Archives</h1>
                <p className="text-[10px] mono text-zinc-500 font-bold uppercase tracking-widest mt-1">Cognitive Fingerprint History</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs mono text-zinc-500 font-bold uppercase tracking-widest">
               <span className="text-emerald-500/50">SECURE_SYNC: COMPLETED</span>
               <i className="fas fa-cloud-check text-emerald-500"></i>
            </div>
          </header>
          <PastRecords />
        </div>
      )}

      {/* Global Footer Overlay */}
      <footer className="mt-8 flex justify-between items-center text-[9px] mono text-zinc-600 font-black tracking-widest uppercase">
        <div className="flex gap-8">
           <span className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-700 rounded-full" /> CORE_OS: v4.2.1-STABLE</span>
           <span className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-700 rounded-full" /> VIEW_MODE: {currentView}</span>
           <span className="flex items-center gap-2"><div className="w-1 h-1 bg-zinc-700 rounded-full" /> NODE_LOC: US_PACIFIC_NW</span>
        </div>
        <div className="flex gap-6 items-center">
           <span className="text-zinc-500">PRIVACY_ENCRYPTED: TRUE</span>
           <div className="h-6 w-px bg-white/5" />
           <span className="text-emerald-500/40">CogniHood Architecture</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
