import React, { useEffect, useState } from 'react';
import CameraPreview from './CameraPreview';
import { LocalFaceSnapshot, PreDriveCheckResult } from '../types';
import { evaluatePreDriveCheck, PRE_DRIVE_SCAN_MS } from '../services/preDriveCheck';
import { MetricsBuffer } from '../services/metricsBuffer';
import PageHeader from './ui/PageHeader';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface PreDriveGateProps {
  onPassed: (remoteAnalysisEnabled: boolean) => void | Promise<void>;
  onCancel: () => void;
}

const PreDriveGate: React.FC<PreDriveGateProps> = ({ onPassed, onCancel }) => {
  const [cameraConsent, setCameraConsent] = useState(false);
  const [scanStarted, setScanStarted] = useState<number | null>(null);
  const [check, setCheck] = useState<PreDriveCheckResult | null>(null);
  const [tick, setTick] = useState(0);
  const [remoteAnalysisConsent, setRemoteAnalysisConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const bufferRef = React.useRef(new MetricsBuffer());

  const handleSnapshot = (snapshot: LocalFaceSnapshot) => {
    if (scanStarted === null) return;
    bufferRef.current.add(snapshot);
    const result = evaluatePreDriveCheck(bufferRef.current.getInWindow(PRE_DRIVE_SCAN_MS + 5000), scanStarted);
    setCheck(result);
  };

  const progress = scanStarted === null
    ? 0
    : Math.min(100, ((Date.now() - scanStarted) / PRE_DRIVE_SCAN_MS) * 100);

  useEffect(() => {
    if (scanStarted === null) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
      const result = evaluatePreDriveCheck(bufferRef.current.getInWindow(PRE_DRIVE_SCAN_MS + 5000), scanStarted);
      setCheck(result);
    }, 500);
    return () => clearInterval(interval);
  }, [scanStarted]);

  void tick;

  const beginCameraCheck = () => {
    bufferRef.current = new MetricsBuffer();
    setCheck(null);
    setScanStarted(Date.now());
  };

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <PageHeader
        title="Pre-drive check"
        description="15-second camera signal-quality check before monitoring begins."
        onBack={onCancel}
        breadcrumbs={[
          { label: 'Home', onClick: onCancel },
          { label: 'Pre-drive' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] min-h-[240px] lg:min-h-[400px] bg-[var(--bg-muted)]">
          {scanStarted !== null ? (
            <CameraPreview
              isActive
              onFrame={() => {}}
              onLocalSnapshot={handleSnapshot}
              remoteAnalysisEnabled={false}
              stateColor="var(--primary)"
            />
          ) : (
            <div className="h-full min-h-[240px] lg:min-h-[400px] flex flex-col items-center justify-center gap-3 p-8 text-center">
              <i className="fas fa-camera text-3xl text-[var(--text-secondary)]" aria-hidden="true" />
              <p className="ui-h2">Camera is off</p>
              <p className="ui-body">Review the camera notice and choose whether to begin local processing.</p>
            </div>
          )}
        </div>

        <Card className="flex flex-col justify-center gap-6">
          {scanStarted === null ? (
            <div className="space-y-5">
              <div>
                <h2 className="ui-h2 mb-2">Camera processing notice</h2>
                <p className="ui-body">
                  CogniHood will process live camera frames on this device to estimate face landmarks, eye closure,
                  blink activity, and head-pose variation. Raw video is not intentionally stored in the CogniHood
                  database, and this feature is not designed to identify you.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning-muted)] p-4 text-sm">
                These experimental signals may be inaccurate and do not determine impairment, a medical condition,
                attention, or fitness to drive. Complete this setup only while safely parked.
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={cameraConsent}
                  onChange={event => setCameraConsent(event.target.checked)}
                />
                <span className="text-sm">
                  I am at least 18, have reviewed the{' '}
                  <a className="underline" href="/privacy.html#camera" target="_blank" rel="noreferrer">camera privacy notice</a>{' '}
                  and <a className="underline" href="/safety.html" target="_blank" rel="noreferrer">safety notice</a>,
                  and consent to local face-landmark processing for this session.
                </span>
              </label>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button className="flex-1" onClick={beginCameraCheck} disabled={!cameraConsent}>
                  Enable camera check
                </Button>
              </div>
            </div>
          ) : (
          <>
          <div>
            <h2 className="ui-h2 mb-2">Signal-quality check</h2>
            <p className="ui-body">
              Look at the camera naturally. This verifies camera visibility and establishes a session reference; it does not determine fitness to drive.
            </p>
          </div>

          <div>
            <div className="flex justify-between ui-caption mb-2">
              <span>Scan progress</span>
              <span className="mono">{Math.round(progress)}%</span>
            </div>
            <div className="ui-progress" role="progressbar" aria-label="Pre-drive scan progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <div className="ui-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {check && (
            <div
              className={`p-4 rounded-lg border ${
                check.passed
                  ? 'bg-[var(--success-muted)] border-[var(--success)]/30'
                  : 'bg-[var(--bg-muted)] border-[var(--border)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge tone={check.passed ? 'success' : 'neutral'}>{check.eligibility}</Badge>
              </div>
              <p className="text-sm font-medium">{check.message}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 ui-caption mono">
                <div>PERCLOS: <span className="font-semibold">{check.perclos.toFixed(1)}%</span></div>
                <div>Face: <span className="font-semibold">{check.faceDetectionRate.toFixed(0)}%</span></div>
              </div>
            </div>
          )}

          {check?.passed && (
            <div className="space-y-4">
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={remoteAnalysisConsent}
                  onChange={event => setRemoteAnalysisConsent(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold">Enable optional cloud AI enhancement</span>
                  <span className="ui-caption block mt-1">
                    A compressed camera frame is sent through CogniHood's protected backend about every 15 seconds,
                    increasing to every 6 or 4 seconds only while warning signals are active. Local-only monitoring
                    remains available without this option.
                  </span>
                </span>
              </label>
              {startError && <p role="alert" className="text-sm text-[var(--error)]">{startError}</p>}
              <Button className="w-full" size="lg" disabled={starting} onClick={async () => {
                setStarting(true); setStartError(null);
                try { await onPassed(remoteAnalysisConsent); }
                catch (error) { setStartError(error instanceof Error ? error.message : 'Could not start monitoring. Please retry.'); }
                finally { setStarting(false); }
              }}>
                {starting ? 'Starting…' : `Begin ${remoteAnalysisConsent ? 'enhanced' : 'local-only'} monitoring`}
              </Button>
            </div>
          )}
          </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PreDriveGate;
