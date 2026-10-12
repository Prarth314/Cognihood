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
  const lastLocalSampleRef = useRef(0);
  const onLocalSnapshotRef = useRef(onLocalSnapshot);
  onLocalSnapshotRef.current = onLocalSnapshot;

  useEffect(() => {
    let cancelled = false;
    import('../services/faceLandmarker').then(mod => {
      if (cancelled) return;
      landmarkerRef.current = mod;
      mod.initFaceLandmarker().then(ok => {
        if (!cancelled) setLandmarkerReady(ok);
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let acquiredStream: MediaStream | null = null;
    let cancelled = false;

    async function setupCamera() {
      try {
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
      }
    }
    setupCamera();
    return () => {
      cancelled = true;
      acquiredStream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    let rafId = 0;
    const tick = (now: number) => {
      const video = videoRef.current;
      const mod = landmarkerRef.current;
      if (video && mod && video.readyState >= 2 && now - lastLocalSampleRef.current >= LOCAL_SAMPLE_MS) {
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
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
          onFrame(base64);
        }
      }
    }, remoteAnalysisIntervalMs);

    return () => clearInterval(interval);
  }, [isActive, onFrame, remoteAnalysisEnabled, remoteAnalysisIntervalMs]);

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
            {trackingActive ? 'Face tracking active' : 'Loading face model…'}
          </Badge>
          <div className="flex items-center gap-1.5 ui-surface px-2 py-1 rounded-md">
            <span className="ui-status-dot ui-status-error" aria-hidden="true" />
            <span className="ui-caption">Recording</span>
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
    </div>
  );
};

export default CameraPreview;
