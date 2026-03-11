
import React, { useRef, useEffect, useState } from 'react';

interface CameraPreviewProps {
  onFrame: (base64: string) => void;
  isActive: boolean;
  stateColor: string;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ onFrame, isActive, stateColor }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Error accessing camera", err);
      }
    }
    setupCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Increased analysis frequency to 2.5 seconds for better hackathon responsiveness
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
          onFrame(base64);
        }
      }
    }, 2500); 

    return () => clearInterval(interval);
  }, [isActive, onFrame]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 transition-colors duration-500 shadow-2xl ${stateColor}`}>
      <div className="scanline"></div>
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover grayscale brightness-75 contrast-125"
      />
      <canvas ref={canvasRef} width="640" height="480" className="hidden" />
      
      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="bg-black/50 px-3 py-1 rounded text-[10px] mono tracking-widest uppercase border border-white/20">
            CAM_IN_01 // LIVE
          </div>
          <div className="flex gap-2">
             <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] mono uppercase">Rec</span>
          </div>
        </div>
        
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="h-1 w-12 bg-white/20" />
            <div className="h-1 w-8 bg-white/20" />
          </div>
          <div className="text-[10px] mono text-right">
             84.2234° N<br/>
             12.4412° W
          </div>
        </div>
      </div>

      {/* Decorative Corner Borders */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-xl pointer-events-none" />
    </div>
  );
};

export default CameraPreview;
