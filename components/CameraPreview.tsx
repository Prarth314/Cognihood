import React, { useRef, useEffect, useState } from 'react';
import { LocalFaceSnapshot } from '../types';
import Badge from './ui/Badge';
import { CameraLease, type CameraState } from '../services/cameraLease';

type FaceTracker = import('../services/faceTracker').FaceTracker;

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
  const trackerRef = useRef<FaceTracker | null>(null);
  const cameraLeaseRef = useRef<CameraLease | null>(null);
  const [trackingMode, setTrackingMode] = useState<'worker' | 'main'>('worker');
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const [landmarkerFailed, setLandmarkerFailed] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('closed');
  const cameraReadyRef = useRef(false);
  const visibilityEpoch = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const lastLocalSampleRef = useRef(0);
  const onLocalSnapshotRef = useRef(onLocalSnapshot);
  onLocalSnapshotRef.current = onLocalSnapshot;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!isActive || !videoRef.current) return;
    let cancelled = false;
    const controller = new AbortController();
    const missing = () => onLocalSnapshotRef.current({ timestamp: Date.now(), faceDetected: false,
      eyesClosed: false, blinkDetected: false, ear: 0, headPose: { pitch: 0, yaw: 0, roll: 0 } });
    setLandmarkerReady(false); setLandmarkerFailed(false); setCameraError(null);
    lastLocalSampleRef.current = 0;
    const lease = new CameraLease(videoRef.current, state => {
      if (cancelled) return;
      setCameraState(state); cameraReadyRef.current = state === 'ready';
      if (state === 'ready') setCameraError(null);
      if (['muted', 'ended', 'denied', 'unavailable'].includes(state)) missing();
      if (state === 'ended') {
        controller.abort(); trackerRef.current?.close(); trackerRef.current = null;
        setLandmarkerReady(false); setCameraError('Camera disconnected or permission was revoked. Reconnect it or review browser permissions, then retry.');
      } else if (state === 'denied' || state === 'unavailable') {
        setCameraError(state === 'denied' ? 'Camera permission denied. Allow access in browser settings, then retry.' : 'Camera unavailable. Check that a camera is connected and not in use, then retry.');
      }
    });
    cameraLeaseRef.current = lease;
    const handleVisibility = () => {
      visibilityEpoch.current++;
      lease.setVisible(!document.hidden);
      if (document.hidden) missing();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    void lease.start().then(async acquired => {
      if (!acquired || cancelled || controller.signal.aborted) return;
      lease.setVisible(!document.hidden);
      const module = await import('../services/faceTracker');
      const tracker = await module.createFaceTracker({ signal: controller.signal });
      if (cancelled) { tracker.close(); return; }
      trackerRef.current = tracker; setTrackingMode(tracker.mode); setLandmarkerReady(true);
    }).catch(() => {
      if (cancelled || controller.signal.aborted) return;
      setLandmarkerFailed(true); setLandmarkerReady(false); lease.close();
      setCameraError('Face model unavailable. Check your connection for the model download, then retry.');
      missing();
    });
    return () => {
      cancelled = true;
      cameraReadyRef.current = false; visibilityEpoch.current++;
      document.removeEventListener('visibilitychange', handleVisibility);
      controller.abort(); trackerRef.current?.close(); trackerRef.current = null; lease.close();
    };
  }, [isActive, attempt]);

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
      void wakeLock?.release().catch(() => {});
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    let rafId = 0;
    const tick = (now: number) => {
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (!document.hidden && cameraReadyRef.current && video && tracker && video.readyState >= 2 && now - lastLocalSampleRef.current >= LOCAL_SAMPLE_MS) {
        lastLocalSampleRef.current = now;
        const epoch = visibilityEpoch.current;
        void tracker.analyze(video, now).then(snapshot => {
          if (snapshot && trackerRef.current === tracker && cameraReadyRef.current && epoch === visibilityEpoch.current && !document.hidden) onLocalSnapshotRef.current(snapshot);
        }).catch(() => {
          if (trackerRef.current !== tracker) return;
          tracker.close(); trackerRef.current = null;
          cameraLeaseRef.current?.close();
          onLocalSnapshotRef.current({ timestamp: Date.now(), faceDetected: false, eyesClosed: false, blinkDetected: false, ear: 0, headPose: { pitch: 0, yaw: 0, roll: 0 } });
          setLandmarkerReady(false); setLandmarkerFailed(true);
          setCameraError('Face analysis stopped. Restart the camera check before monitoring.');
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !remoteAnalysisEnabled || cameraState !== 'ready' || !landmarkerReady) return;

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
  }, [isActive, remoteAnalysisEnabled, remoteAnalysisIntervalMs, cameraState, landmarkerReady]);

  const trackingActive = isActive && landmarkerReady && cameraState === 'ready';

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
            {trackingActive ? 'Local analysis ready' : landmarkerFailed ? 'Face model unavailable' : cameraState === 'pending' ? 'Waiting for camera permission…' : cameraState === 'ready' ? 'Loading face model…' : 'Camera signal unavailable'}
          </Badge>
          <div className="flex items-center gap-1.5 ui-surface px-2 py-1 rounded-md">
            <span className="ui-status-dot ui-status-error" aria-hidden="true" />
            <span className="ui-caption" role="status">{isActive && cameraState === 'ready' ? 'Camera available · not recorded' : cameraState === 'muted' ? 'Camera signal interrupted' : cameraState === 'pending' ? 'Review the browser permission prompt' : 'Camera off'}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <span className="ui-caption mono ui-surface px-2 py-1 rounded-md">
            {remoteAnalysisEnabled
              ? `Up to 10Hz local · ${(1000 / remoteAnalysisIntervalMs).toFixed(2)}Hz cloud`
              : `Up to 10Hz · ${trackingMode === 'worker' ? 'local worker' : 'compatibility mode'}`}
          </span>
        </div>
      </div>
      {cameraError && (
        <div className="absolute inset-x-3 bottom-3 ui-surface p-3 rounded-md text-sm text-[var(--error)]" role="alert">
          {cameraError}
          <button type="button" className="underline ml-2" onClick={() => setAttempt(value => value + 1)}>Retry camera check</button>
        </div>
      )}
    </div>
  );
};

export default CameraPreview;
