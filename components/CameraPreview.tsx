import React, { useRef, useEffect, useState } from 'react';
import { LocalFaceSnapshot } from '../types';
import Badge from './ui/Badge';

type FaceLandmarkerModule = typeof import('../services/faceLandmarker');

interface CameraPreviewProps {
  onFrame: (base64: string) => void;
  onLocalSnapshot: (snapshot: LocalFaceSnapshot) => void;
  isActive: boolean;
  remoteAnalysisEnabled?: boolean;
  remoteAnalysisIntervalMs?: number;
  stateColor?: string;
}

const LOCAL_SAMPLE_MS = 100;

const CameraPreview: React.FC<CameraPreviewProps> = ({
  onFrame,
  onLocalSnapshot,
  isActive,
  remoteAnalysisEnabled = false,
  remoteAnalysisIntervalMs = 15_000,
  stateColor,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarkerModule | null>(null);
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const [landmarkerFailed, setLandmarkerFailed] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastLocalSampleRef = useRef(0);
  const onLocalSnapshotRef = useRef(onLocalSnapshot);
  onLocalSnapshotRef.current = onLocalSnapshot;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    let cancelled = false;
    import('../services/faceLandmarker').then(mod => {
      if (cancelled) return;
      landmarkerRef.current = mod;
      mod.initFaceLandmarker().then(ok => {
        if (!cancelled) {
          setLandmarkerReady(ok);
          setLandmarkerFailed(!ok);
          if (ok) mod.resetFaceTrackingState();
        }
      });
    }).catch(() => { if (!cancelled) setLandmarkerFailed(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let acquiredStream: MediaStream | null = null;
    let cancelled = false;

    async function setupCamera() {
      try {
        setCameraError(null);
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (cancelled) {
          s.getTracks().forEach(track => track.stop());
          return;
        }
        acquiredStream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error('Error accessing camera', err);
        setCameraError('Camera access failed. Check browser permissions and reload before monitoring.');
      }
    }
    const handleVisibility = () => {
      acquiredStream?.getVideoTracks().forEach(track => { track.enabled = !document.hidden; });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    setupCamera();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelled = true;
      acquiredStream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;
    type WakeLockSentinel = { release: () => Promise<void>; addEventListener: (type: string, listener: () => void) => void };
    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } }).wakeLock;
      if (!wakeLockApi || document.hidden) return;
      try {
        const lock = await wakeLockApi.request('screen');
        if (cancelled) await lock.release();
        else {
          wakeLock = lock;
          lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
        }
      } catch {
        // Monitoring still works while the page remains active; the display may sleep.
      }
    };
    const handleVisibility = () => { if (!document.hidden && !wakeLock) void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void wakeLock?.release();
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    let rafId = 0;
    const tick = (now: number) => {
      const video = videoRef.current;
      const mod = landmarkerRef.current;
      if (!document.hidden && video && mod && video.readyState >= 2 && now - lastLocalSampleRef.current >= LOCAL_SAMPLE_MS) {
        lastLocalSampleRef.current = now;
        const snapshot = mod.detectFaceFromVideo(video, now);
        onLocalSnapshotRef.current(snapshot);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !remoteAnalysisEnabled) return;

    const interval = setInterval(() => {
      if (!document.hidden && videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
          onFrameRef.current(base64);
        }
      }
    }, remoteAnalysisIntervalMs);

    return () => clearInterval(interval);
  }, [isActive, remoteAnalysisEnabled, remoteAnalysisIntervalMs]);

  const trackingActive = landmarkerReady && landmarkerRef.current?.isFaceLandmarkerReady();

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[var(--bg-muted)]"
      style={stateColor ? { borderColor: stateColor } : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        aria-label="Driver camera preview"
      />
      <canvas ref={canvasRef} width="640" height="480" className="hidden" aria-hidden="true" />

      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-2">
          <Badge tone={trackingActive ? 'success' : 'neutral'}>
            {trackingActive ? 'Face tracking active' : landmarkerFailed ? 'Face model unavailable' : 'Loading face model…'}
          </Badge>
          <div className="flex items-center gap-1.5 ui-surface px-2 py-1 rounded-md">
            <span className="ui-status-dot ui-status-error" aria-hidden="true" />
            <span className="ui-caption">Camera active · not recorded</span>
          </div>
        </div>

        <div className="flex justify-end">
          <span className="ui-caption mono ui-surface px-2 py-1 rounded-md">
            {remoteAnalysisEnabled
              ? `10Hz local · ${(1000 / remoteAnalysisIntervalMs).toFixed(2)}Hz cloud`
              : '10Hz · local only'}
          </span>
        </div>
      </div>
      {cameraError && (
        <div className="absolute inset-x-3 bottom-3 ui-surface p-3 rounded-md text-sm text-[var(--error)]" role="alert">
          {cameraError}
        </div>
      )}
    </div>
  );
};

export default CameraPreview;
