
import React, { useState, useCallback, useEffect, useRef } from 'react';
import CameraPreview from './components/CameraPreview';
import MetricsPanel from './components/MetricsPanel';
import NavigationPanel from './components/NavigationPanel';
import NetworkAwareness from './components/NetworkAwareness';
import InterventionPanel from './components/InterventionPanel';
import PastRecords from './components/PastRecords';
import EligibilityPanel from './components/EligibilityPanel';
import PreDriveGate from './components/PreDriveGate';
import AttentionCheck from './components/AttentionCheck';
import TripSummaryModal from './components/TripSummaryModal';
import LandingAuth from './components/LandingAuth';
import ModuleSelector from './components/ModuleSelector';
import AppShell, { AppView } from './components/layout/AppShell';
import PageHeader from './components/ui/PageHeader';
import OnboardingTour from './components/OnboardingTour';
import ThemeToggle from './components/ui/ThemeToggle';
import Button from './components/ui/Button';
import { useAuth } from './contexts/AuthContext';
import {
  SafetyAssessment,
  SafetyState,
  NetworkEvent,
  TemporalAnalysis,
  EligibilityAssessment,
  EligibilityState,
  LocalFaceSnapshot,
  TripRecord,
  Poi,
} from './types';
import Badge from './components/ui/Badge';
import { analyzeDrivingEnvironmentLazy } from './services/geminiLoader';
import { MetricsBuffer } from './services/metricsBuffer';
import { computeTemporalAnalysis } from './services/temporalAnalysis';
import { EligibilityEngine } from './services/eligibilityEngine';
import { TripSession } from './services/tripSession';
import { saveTrip, getAllTrips, getBaseline, saveBaseline } from './services/tripStore';
import { computeFingerprint } from './services/baselineService';
import { startMotionListener, stopMotionListener, startSimulatedMotion } from './services/motionService';
import { speakCalm, speakUrgent } from './services/ttsService';

const SAFETY_COLORS: Record<SafetyState, { text: string; border: string }> = {
  [SafetyState.SAFE]: { text: 'var(--success)', border: 'var(--success)' },
  [SafetyState.WARNING]: { text: 'var(--warning)', border: 'var(--warning)' },
  [SafetyState.CRITICAL]: { text: 'var(--error)', border: 'var(--error)' },
  [SafetyState.OVERRIDE]: { text: 'var(--secondary)', border: 'var(--secondary)' },
};

const App: React.FC = () => {
  const { user, cogniId, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [assessment, setAssessment] = useState<SafetyAssessment | null>(null);
  const [history, setHistory] = useState<SafetyAssessment[]>([]);
  const [networkEvents, setNetworkEvents] = useState<NetworkEvent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [temporalAnalysis, setTemporalAnalysis] = useState<TemporalAnalysis | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityAssessment | null>(null);
  const [completedTrip, setCompletedTrip] = useState<TripRecord | null>(null);
  const [rerouteMsg, setRerouteMsg] = useState<string | null>(null);
  const [tripSaveError, setTripSaveError] = useState<string | null>(null);

  const metricsBufferRef = useRef(new MetricsBuffer());
  const eligibilityEngineRef = useRef(new EligibilityEngine());
  const tripSessionRef = useRef<TripSession | null>(null);
  const latestSnapshotRef = useRef<LocalFaceSnapshot | null>(null);
  const assessmentRef = useRef<SafetyAssessment | null>(null);
  const lastUiUpdateRef = useRef(0);
  const lastEligibilityRef = useRef<EligibilityState | null>(null);
  const stopSimMotionRef = useRef<(() => void) | null>(null);
  assessmentRef.current = assessment;

  const endTrip = useCallback(async () => {
    const session = tripSessionRef.current;
    if (!session || !user) return;

    setTripSaveError(null);
    try {
      const baseline = await getBaseline(user.id);
      const trip = session.finalize(baseline);
      await saveTrip(trip);

      const allTrips = await getAllTrips(user.id);
      const fp = computeFingerprint(allTrips, user.id);
      if (fp) await saveBaseline(fp);

      tripSessionRef.current = null;
      setCompletedTrip(trip);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save trip to Supabase';
      setTripSaveError(msg);
      console.error(msg);
    }
  }, [user]);

  const leaveDashboard = useCallback(async () => {
    stopMotionListener();
    stopSimMotionRef.current?.();
    stopSimMotionRef.current = null;
    await endTrip();
    metricsBufferRef.current.clear();
    eligibilityEngineRef.current.reset();
    setTemporalAnalysis(null);
    setEligibility(null);
    setAssessment(null);
    setHistory([]);
    lastEligibilityRef.current = null;
  }, [endTrip]);

  useEffect(() => {
    if (currentView !== 'dashboard' || !user) return;

    tripSessionRef.current = new TripSession(user.id);
    const motionOk = startMotionListener((type, g) => {
      if (type === 'brake') tripSessionRef.current?.recordHarshBrake(g);
      else tripSessionRef.current?.recordHarshAccel(g);
    });
    if (!motionOk) {
      stopSimMotionRef.current = startSimulatedMotion((type, g) => {
        if (type === 'brake') tripSessionRef.current?.recordHarshBrake(g);
        else tripSessionRef.current?.recordHarshAccel(g);
      });
    }

    return () => {
      stopMotionListener();
      stopSimMotionRef.current?.();
    };
  }, [currentView, user]);

  useEffect(() => {
    if (currentView !== 'dashboard') return;
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const types: NetworkEvent['type'][] = ['FATIGUE_BEACON', 'EMERGENCY_CORRIDOR', 'GHOST_OBJECT', 'DE_ESCALATION'];
        const type = types[Math.floor(Math.random() * types.length)];
        setNetworkEvents(prev => [{
          id: `ev_${Date.now()}`,
          type,
          originId: `V_${Math.floor(Math.random() * 999)}`,
          location: { lat: 34.05, lng: -118.24 },
          severity: Math.random() * 100,
          message: type === 'EMERGENCY_CORRIDOR' ? 'Ambulance path detected 1.2km behind.' :
            type === 'FATIGUE_BEACON' ? 'Preceding vehicle shows high instability markers.' :
            type === 'GHOST_OBJECT' ? 'Hazard detected by lead vehicle in blind corner.' :
            'Overtake signal received: Neutral intent.',
        }, ...prev].slice(0, 5));
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [currentView]);

  const runTemporalPipeline = useCallback((gemini?: SafetyAssessment | null) => {
    const snapshots = metricsBufferRef.current.getInWindow(60_000);
    const temporal = computeTemporalAnalysis(snapshots, gemini?.metrics ?? assessmentRef.current?.metrics);
    const elig = eligibilityEngineRef.current.evaluate(temporal, gemini ?? assessmentRef.current ?? undefined);
    setTemporalAnalysis(temporal);
    setEligibility(elig);

    if (elig.state !== lastEligibilityRef.current) {
      if (elig.state === EligibilityState.INELIGIBLE) {
        speakUrgent('Alertness below safe threshold. Pull over when possible.');
      } else if (elig.state === EligibilityState.CAUTION) {
        speakCalm('Elevated fatigue or hypnosis risk detected. Consider a break.');
      }
      lastEligibilityRef.current = elig.state;
    }

    return { temporal, elig };
  }, []);

  const handleLocalSnapshot = useCallback((snapshot: LocalFaceSnapshot) => {
    if (currentView !== 'dashboard') return;
    metricsBufferRef.current.add(snapshot);
    latestSnapshotRef.current = snapshot;
    const { temporal, elig } = runTemporalPipeline();

    const now = Date.now();
    if (now - lastUiUpdateRef.current < 500) return;
    lastUiUpdateRef.current = now;

    if (assessmentRef.current) {
      const updated: SafetyAssessment = {
        ...assessmentRef.current,
        metrics: snapshot.faceDetected ? {
          ...assessmentRef.current.metrics,
          ear: snapshot.ear,
          headPose: snapshot.headPose,
          blinkRate: temporal.blinkRatePerMin || assessmentRef.current.metrics.blinkRate,
        } : assessmentRef.current.metrics,
        temporal,
        eligibility: elig,
      };
      setAssessment(updated);
      tripSessionRef.current?.recordAssessment(updated, temporal);
    } else if (temporal.sampleCount > 0) {
      setTemporalAnalysis(temporal);
      setEligibility(elig);
    }
  }, [currentView, runTemporalPipeline]);

  const handleFrame = useCallback(async (base64: string) => {
    if (isAnalyzing || currentView !== 'dashboard') return;
    setIsAnalyzing(true);
    try {
      const snapshots = metricsBufferRef.current.getInWindow(60_000);
      const temporal = computeTemporalAnalysis(snapshots, assessmentRef.current?.metrics);
      const result = await analyzeDrivingEnvironmentLazy(base64, history, temporal, latestSnapshotRef.current);
      const { temporal: updatedTemporal, elig } = runTemporalPipeline(result);
      const full = { ...result, temporal: updatedTemporal, eligibility: elig };
      setAssessment(full);
      setHistory(prev => [...prev.slice(-20), full]);
      tripSessionRef.current?.recordAssessment(full, updatedTemporal);
    } catch (err) {
      console.error('Frame analysis error', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, history, currentView, runTemporalPipeline]);

  const handleAttentionPass = () => speakCalm('Attention confirmed. Stay focused.');
  const handleAttentionFail = () => {
    tripSessionRef.current?.recordAttentionFail();
    speakUrgent('Attention check missed. Re-center your focus on the road.');
  };

  const handleReroute = (poi: Poi) => {
    setRerouteMsg(`Rerouting to ${poi.name} (${poi.distance})`);
    speakCalm(`Rerouting to ${poi.name}. Low cognitive load rest stop ahead.`);
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentView('landing');
  };

  const handleNavigate = (view: AppView) => {
    if (view === 'dashboard' && currentView !== 'dashboard') {
      setCurrentView('predrive');
      return;
    }
    if (currentView === 'dashboard' && view !== 'dashboard') {
      leaveDashboard().then(() => setCurrentView(view));
      return;
    }
    setCurrentView(view);
  };

  const safetyState = assessment?.state ?? SafetyState.SAFE;
  const safetyColors = SAFETY_COLORS[safetyState];
  const defaultMetrics = { ear: 0.3, blinkRate: 12, closureDuration: 0.1, headPose: { pitch: 0, yaw: 0, roll: 0 }, stressLevel: 0, distractionLevel: 0, cognitiveLoad: 8 };
  const showCriticalOverlay = assessment?.state === SafetyState.CRITICAL || eligibility?.state === EligibilityState.INELIGIBLE;

  const accessibilityToggle = (
    <Button
      variant={accessibilityMode ? 'primary' : 'secondary'}
      size="sm"
      onClick={() => setAccessibilityMode(!accessibilityMode)}
      aria-pressed={accessibilityMode}
    >
      High contrast {accessibilityMode ? 'on' : 'off'}
    </Button>
  );

  if (currentView === 'landing') {
    return (
      <div className={accessibilityMode ? 'contrast-125 saturate-150' : ''}>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle compact />
        </div>
        <LandingAuth onAuthenticated={() => setCurrentView('selector')} />
      </div>
    );
  }

  return (
    <div className={accessibilityMode ? 'contrast-125 saturate-150' : ''}>
      <AppShell
        currentView={currentView}
        onNavigate={handleNavigate}
        cogniId={cogniId}
        onSignOut={handleSignOut}
        headerActions={
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            {currentView === 'dashboard' ? accessibilityToggle : null}
          </div>
        }
      >
        {currentView === 'selector' && user && (
          <ModuleSelector
            cogniId={cogniId}
            onStartTrip={() => setCurrentView('predrive')}
            onViewArchives={() => setCurrentView('records')}
          />
        )}

        {currentView === 'predrive' && (
          <PreDriveGate
            onPassed={() => setCurrentView('dashboard')}
            onCancel={() => setCurrentView('selector')}
          />
        )}

        {currentView === 'dashboard' && (
          <div className="flex flex-col gap-4 lg:gap-6 min-h-0">
            <PageHeader
              title="Live monitoring"
              description={rerouteMsg ?? `Trip ${tripSessionRef.current?.id ?? 'active'}`}
              breadcrumbs={[
                { label: 'Home', onClick: () => handleNavigate('selector') },
                { label: 'Live drive' },
              ]}
              actions={
                <Button variant="danger" size="sm" onClick={() => handleNavigate('selector')}>
                  <i className="fas fa-stop" aria-hidden="true" /> End trip
                </Button>
              }
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0">
              <div className="xl:col-span-3 flex flex-col gap-4 order-2 xl:order-1">
                <EligibilityPanel eligibility={eligibility} temporal={temporalAnalysis} />
                <MetricsPanel metrics={assessment?.metrics || defaultMetrics} temporal={temporalAnalysis} />
                <InterventionPanel assessment={assessment} />
              </div>

              <div className="xl:col-span-6 flex flex-col gap-4 order-1 xl:order-2 min-h-0">
                <div
                  className="relative rounded-xl overflow-hidden border-2 min-h-[220px] sm:min-h-[320px] lg:min-h-[400px] flex-1"
                  style={{ borderColor: safetyColors.border }}
                >
                  <CameraPreview
                    isActive
                    onFrame={handleFrame}
                    onLocalSnapshot={handleLocalSnapshot}
                  />
                  <div className="absolute top-4 left-4 ui-surface p-4 rounded-lg pointer-events-none" aria-live="polite">
                    <div className="ui-caption font-medium mb-1">Safety index</div>
                    <div className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: safetyColors.text }}>
                      {assessment?.score.toFixed(0) || '100'}
                    </div>
                  </div>
                  {isAnalyzing && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 ui-surface px-4 py-2 rounded-full">
                      <Badge tone="primary">Processing vision stream</Badge>
                    </div>
                  )}
                </div>
                <div className="ui-card">
                  <p className="ui-body">{assessment?.explanation || 'Establishing temporal baseline…'}</p>
                </div>
              </div>

              <div className="xl:col-span-3 flex flex-col gap-4 order-3 min-h-[280px] xl:min-h-0">
                <div className="flex-1 min-h-[200px]">
                  <NavigationPanel safetyState={safetyState} onReroute={handleReroute} />
                </div>
                <div className="flex-1 min-h-[200px]">
                  <NetworkAwareness events={networkEvents} />
                </div>
              </div>
            </div>

            {showCriticalOverlay && (
              <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4" role="alert">
                <div className="ui-card border-2 border-[var(--error)] bg-[var(--error-muted)] text-center max-w-lg animate-pulse">
                  <h2 className="ui-h1 text-[var(--error)]">
                    {eligibility?.state === EligibilityState.INELIGIBLE ? 'Ineligible to drive' : 'Critical intervention'}
                  </h2>
                  <p className="ui-caption mt-2 uppercase">{eligibility?.primaryReason}</p>
                </div>
              </div>
            )}

            <AttentionCheck active onPass={handleAttentionPass} onFail={handleAttentionFail} />
          </div>
        )}

        {currentView === 'records' && (
          <div className="flex flex-col gap-6 min-h-0">
            <PageHeader
              title="Trip archives"
              description="Performance history synced from Supabase"
              breadcrumbs={[
                { label: 'Home', onClick: () => setCurrentView('selector') },
                { label: 'Archives' },
              ]}
            />
            <PastRecords />
          </div>
        )}
      </AppShell>

      {completedTrip && (
        <TripSummaryModal
          trip={completedTrip}
          onClose={() => { setCompletedTrip(null); setCurrentView('selector'); }}
          onViewArchives={() => { setCompletedTrip(null); setCurrentView('records'); }}
        />
      )}

      {tripSaveError && (
        <div className="ui-toast-container" role="alert">
          <div className="ui-toast border-[var(--error)]/30 bg-[var(--error-muted)]">
            <p className="text-sm text-[var(--error)] font-medium">Trip save failed: {tripSaveError}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTripSaveError(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <OnboardingTour currentView={currentView} />
    </div>
  );
};

export default App;
