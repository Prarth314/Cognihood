import React, { useEffect, useState, useRef } from 'react';
import CameraPreview from './CameraPreview';
import { LocalFaceSnapshot, PreDriveCheckResult } from '../types';
import { evaluatePreDriveCheck, PRE_DRIVE_SCAN_MS } from '../services/preDriveCheck';
import { MetricsBuffer } from '../services/metricsBuffer';
import PageHeader from './ui/PageHeader';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface PreDriveGateProps {
  onPassed: () => void;
  onCancel: () => void;
}

const PreDriveGate: React.FC<PreDriveGateProps> = ({ onPassed, onCancel }) => {
  const [scanStarted] = useState(() => Date.now());
  const [check, setCheck] = useState<PreDriveCheckResult | null>(null);
  const [tick, setTick] = useState(0);
  const bufferRef = React.useRef(new MetricsBuffer());
  const passedRef = useRef(false);

  const handleSnapshot = (snapshot: LocalFaceSnapshot) => {
    bufferRef.current.add(snapshot);
    const result = evaluatePreDriveCheck(bufferRef.current.getInWindow(PRE_DRIVE_SCAN_MS + 5000), scanStarted);
    setCheck(result);
    if (result.passed && !passedRef.current) {
      passedRef.current = true;
      setTimeout(onPassed, 1200);
    }
  };

  const progress = Math.min(100, ((Date.now() - scanStarted) / PRE_DRIVE_SCAN_MS) * 100);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      const result = evaluatePreDriveCheck(bufferRef.current.getInWindow(PRE_DRIVE_SCAN_MS + 5000), scanStarted);
      setCheck(result);
      if (result.passed && !passedRef.current) {
        passedRef.current = true;
        onPassed();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [scanStarted, onPassed]);

  void tick;

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <PageHeader
        title="Pre-drive check"
        description="15-second eligibility baseline scan before monitoring begins."
        onBack={onCancel}
        breadcrumbs={[
          { label: 'Home', onClick: onCancel },
          { label: 'Pre-drive' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] min-h-[240px] lg:min-h-[400px]">
          <CameraPreview
            isActive
            onFrame={() => {}}
            onLocalSnapshot={handleSnapshot}
            stateColor="var(--primary)"
          />
        </div>

        <Card className="flex flex-col justify-center gap-6">
          <div>
            <h2 className="ui-h2 mb-2">Trip authorization</h2>
            <p className="ui-body">
              Look at the camera naturally. We establish your alertness baseline before live monitoring starts.
            </p>
          </div>

          <div>
            <div className="flex justify-between ui-caption mb-2">
              <span>Scan progress</span>
              <span className="mono">{Math.round(progress)}%</span>
            </div>
            <div className="ui-progress">
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
            <Button className="w-full" size="lg" onClick={onPassed}>
              Begin trip monitoring
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PreDriveGate;
