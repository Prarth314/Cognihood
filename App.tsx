
import React, { useState, useCallback, useEffect, useRef } from 'react';
import CameraPreview from './components/CameraPreview';
import MetricsPanel from './components/MetricsPanel';
import NavigationPanel from './components/NavigationPanel';
import NetworkAwareness from './components/NetworkAwareness';
import InterventionPanel from './components/InterventionPanel';
import PastRecords from './components/PastRecords';
import EligibilityPanel from './components/EligibilityPanel';
import PreDriveGate from './components/PreDriveGate';
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
import { saveTrip, getBaseline } from './services/tripStore';
import { requestMotionPermission, startMotionListener, stopMotionListener } from './services/motionService';
import { speakCalm, speakUrgent } from './services/ttsService';
import { createLocalSafetyAssessment } from './services/localSafetyService';

const SAFETY_COLORS: Record<SafetyState, { text: string; border: string }> = {
  [SafetyState.SAFE]: { text: 'var(--success)', border: 'var(--success)' },
  [SafetyState.WARNING]: { text: 'var(--warning)', border: 'var(--warning)' },
  [SafetyState.CRITICAL]: { text: 'var(--error)', border: 'var(--error)' },
};

const App: React.FC = () => {
  const { user, cogniId, signOut, deleteAccount } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [assessment, setAssessment] = useState<SafetyAssessment | null>(null);
  const [history, setHistory] = useState<SafetyAssessment[]>([]);
  const networkEvents = [];
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [temporalAnalysis, setTemporalAnalysis] = useState<TemporalAnalysis | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityAssessment | null>(null);
  const [completedTrip, setCompletedTrip] = useState<TripRecord | null>(null);
  const [rerouteMsg, setRerouteMsg] = useState<string | null>(null);
  const [tripSaveError, setTripSaveError] = useState<string | null>(null);
  const [remoteAnalysisEnabled, setRemoteAnalysisEnabled] = useState(false);
  const [remoteAnalysisError, setRemoteAnalysisError] = useState<string | null>(null);
  const [tripNotice, setTripNotice] = useState<string | null>(null);

  const metricsBufferRef = useRef(new MetricsBuffer());
  const eligibilityEngineRef = useRef(new EligibilityEngine());
  const tripSessionRef = useRef<TripSession | null>(null);
  const latestSnapshotRef = useRef<LocalFaceSnapshot | null>(null);
  const assessmentRef = useRef<SafetyAssessment | null>(null);
  const lastUiUpdateRef = useRef(0);
  const lastEligibilityRef = useRef<EligibilityState | null>(null);
  const analyzingRef = useRef(false);
  const remoteEnabledAtStartRef = useRef(false);
  assessmentRef.current = assessment;

  const endTrip = useCallback(async () => {
    const session = tripSessionRef.current;
    if (!session || !user) return true;

    setTripSaveError(null);
    try {
      const baseline = await getBaseline(user.id);
      const trip = session.finalize(baseline);
      tripSessionRef.current = null;
      if (!trip) {
        setTripNotice('Short session discarded because it did not contain enough valid monitoring data.');
        return true;
      }
      await saveTrip(trip);
      setCompletedTrip(trip);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save trip to Supabase';
      setTripSaveError(msg);
      console.error(msg);
      return false;
    }
  }, [user]);

  useEffect(() => {
    if (user || currentView === 'landing') return;
    stopMotionListener();
    tripSessionRef.current = null;
    metricsBufferRef.current.clear();
    eligibilityEngineRef.current.reset();
    analyzingRef.current = false;
    setAssessment(null);
    setHistory([]);
    setTemporalAnalysis(null);
    setEligibility(null);
    setRemoteAnalysisEnabled(false);
    setCurrentView('landing');
  }, [user, currentView]);

  useEffect(() => {
    if (currentView !== 'dashboard') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [currentView]);

  const leaveDashboard = useCallback(async () => {
    stopMotionListener();
    const saved = await endTrip();
    if (!saved) return false;
    metricsBufferRef.current.clear();
    eligibilityEngineRef.current.reset();
    setTemporalAnalysis(null);
    setEligibility(null);
    setAssessment(null);
    setHistory([]);
    setRemoteAnalysisEnabled(false);
    setRemoteAnalysisError(null);
    lastEligibilityRef.current = null;
    return true;
  }, [endTrip]);

  useEffect(() => {
    if (currentView !== 'dashboard' || !user) return;

    tripSessionRef.current = new TripSession(user.id, remoteEnabledAtStartRef.current);
    if (import.meta.env.VITE_ENABLE_EXPERIMENTAL_MOTION === 'true') {
      startMotionListener((type, g) => {
        if (type === 'brake') tripSessionRef.current?.recordHarshBrake(g);
        else tripSessionRef.current?.recordHarshAccel(g);
      });
    }

    return () => {
      stopMotionListener();
    };
  }, [currentView, user]);

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
        speakCalm('Elevated attention-risk signals detected. Consider a break.');
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
      const localAssessment = createLocalSafetyAssessment(temporal, snapshot, assessmentRef.current);
      const base = localAssessment;
      const updated: SafetyAssessment = {
        ...base,
        metrics: snapshot.faceDetected ? {
          ...base.metrics,
          ear: snapshot.ear,
          headPose: snapshot.headPose,
          blinkRate: temporal.blinkRatePerMin || base.metrics.blinkRate,
        } : base.metrics,
        temporal,
        eligibility: elig,
      };
      setAssessment(updated);
      tripSessionRef.current?.recordAssessment(updated, temporal);
    } else if (temporal.sampleCount > 0) {
      const localAssessment = createLocalSafetyAssessment(temporal, snapshot);
      const full = { ...localAssessment, eligibility: elig };
      setAssessment(full);
      assessmentRef.current = full;
      setTemporalAnalysis(temporal);
      setEligibility(elig);
    }
  }, [currentView, runTemporalPipeline, remoteAnalysisEnabled, remoteAnalysisError]);

  const handleFrame = useCallback(async (base64: string) => {
    if (analyzingRef.current || currentView !== 'dashboard') return;
    analyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const snapshots = metricsBufferRef.current.getInWindow(60_000);
      const temporal = computeTemporalAnalysis(snapshots, assessmentRef.current?.metrics);
      const result = await analyzeDrivingEnvironmentLazy(base64, history, temporal, latestSnapshotRef.current);
      const { temporal: updatedTemporal, elig } = runTemporalPipeline(result);
      const full = { ...result, temporal: updatedTemporal, eligibility: elig };
      setRemoteAnalysisError(null);
      setAssessment(full);
      setHistory(prev => [...prev.slice(-20), full]);
      tripSessionRef.current?.recordAssessment(full, updatedTemporal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Remote analysis unavailable';
      setRemoteAnalysisError(message);
      const snapshots = metricsBufferRef.current.getInWindow(60_000);
      const temporal = computeTemporalAnalysis(snapshots, assessmentRef.current?.metrics);
      const local = createLocalSafetyAssessment(temporal, latestSnapshotRef.current, assessmentRef.current);
      const elig = eligibilityEngineRef.current.evaluate(temporal, local);
      const fallback = { ...local, eligibility: elig };
      setAssessment(fallback);
      assessmentRef.current = fallback;
      setTemporalAnalysis(temporal);
      setEligibility(elig);
      console.error('Remote frame analysis unavailable; local monitoring remains active.', err);
    } finally {
      analyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [history, currentView, runTemporalPipeline]);

  const handleReroute = (poi: Poi) => {
    setRerouteMsg(`Demo destination selected: ${poi.name} (${poi.distance})`);
    speakCalm(`${poi.name} selected. Connect a navigation provider before using directions.`);
  };

  const handleSignOut = async () => {
    if (currentView === 'dashboard') {
      const saved = await leaveDashboard();
      if (!saved) return;
    }
    await signOut();
    setCurrentView('landing');
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt('This permanently deletes your account and cloud data. Type DELETE to continue.');
    if (confirmation !== 'DELETE') return;
    stopMotionListener();
    try {
      await deleteAccount();
      setCurrentView('landing');
    } catch {
      setTripNotice('Account deletion could not be completed. Verify the delete-account Edge Function is deployed and try again.');
    }
  };

  const handleNavigate = (view: AppView) => {
    if (view === 'dashboard' && currentView !== 'dashboard') {
      setCurrentView('predrive');
      return;
    }
    if (currentView === 'dashboard' && view !== 'dashboard') {
      leaveDashboard().then(saved => {
        if (saved) setCurrentView(view);
      });
      return;
    }
    setCurrentView(view);
  };

  const safetyState = assessment?.state ?? SafetyState.SAFE;
  const safetyColors = SAFETY_COLORS[safetyState];
  const defaultMetrics = { ear: 0.3, blinkRate: 12, closureDuration: 0.1, headPose: { pitch: 0, yaw: 0, roll: 0 }, stressLevel: 0, distractionLevel: 0, cognitiveLoad: 8 };
  const showCriticalOverlay = assessment?.state === SafetyState.CRITICAL || eligibility?.state === EligibilityState.INELIGIBLE;
  const remoteAnalysisIntervalMs = showCriticalOverlay
    ? 4_000
    : safetyState === SafetyState.WARNING || eligibility?.state === EligibilityState.CAUTION
      ? 6_000
      : 15_000;

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
            {currentView === 'dashboard' && remoteAnalysisEnabled ? (
              <Button variant="secondary" size="sm" onClick={() => setRemoteAnalysisEnabled(false)}>
                Disable cloud analysis
              </Button>
            ) : null}
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
            onDeleteAccount={() => { void handleDeleteAccount(); }}
          />
        )}

        {currentView === 'predrive' && (
          <PreDriveGate
            onPassed={async (enabled) => {
              if (import.meta.env.VITE_ENABLE_EXPERIMENTAL_MOTION === 'true') {
                await requestMotionPermission();
              }
              remoteEnabledAtStartRef.current = enabled;
              setRemoteAnalysisEnabled(enabled);
              setRemoteAnalysisError(null);
              setCurrentView('dashboard');
            }}
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
                    remoteAnalysisEnabled={remoteAnalysisEnabled}
                    remoteAnalysisIntervalMs={remoteAnalysisIntervalMs}
                  />
                  <div className="absolute top-4 left-4 ui-surface p-4 rounded-lg pointer-events-none" aria-live="polite">
                    <div className="ui-caption font-medium mb-1">Safety index</div>
                    <div className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: safetyColors.text }}>
                      {assessment ? assessment.score.toFixed(0) : '—'}
                    </div>
                  </div>
                  {isAnalyzing && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 ui-surface px-4 py-2 rounded-full">
                      <Badge tone="primary">Processing vision stream</Badge>
                    </div>
                  )}
                </div>
                <div className="ui-card">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge tone={assessment?.analysisSource === 'REMOTE' ? 'primary' : 'success'}>
                      {assessment?.analysisSource === 'REMOTE' ? 'Cloud-enhanced' : 'Local monitoring'}
                    </Badge>
                    {remoteAnalysisError && <Badge tone="warning">Cloud analysis unavailable</Badge>}
                  </div>
                  <p className="ui-body">{assessment?.explanation || 'Establishing temporal baseline…'}</p>
                  {remoteAnalysisError && (
                    <p className="ui-caption mt-2" role="status">
                      Local safety monitoring remains active. No unavailable cloud result is being treated as safe.
                    </p>
                  )}
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
                    {eligibility?.state === EligibilityState.INELIGIBLE ? 'Strong attention-risk signal' : 'Immediate attention recommended'}
                  </h2>
                  <p className="ui-caption mt-2 uppercase">{eligibility?.primaryReason}</p>
                </div>
              </div>
            )}

            <p className="sr-only">No screen interaction is required while monitoring is active.</p>
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

      {tripNotice && (
        <div className="ui-toast-container" role="status">
          <div className="ui-toast border-[var(--border)] bg-[var(--bg-surface)]">
            <p className="text-sm font-medium">{tripNotice}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTripNotice(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <OnboardingTour currentView={currentView} />
    </div>
  );
};

export default App;
