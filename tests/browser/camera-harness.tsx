// Test build only. Never calls a real camera or collects footage.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import CameraPreview from '../../components/CameraPreview';
import '../../index.css';
let grant: (() => void) | undefined; let track: MediaStreamTrack | undefined;
const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480; canvas.getContext('2d')!.fillRect(0,0,640,480);
const synthetic = () => { const stream = canvas.captureStream(10); track = stream.getVideoTracks()[0]; return stream; };
const mode = new URLSearchParams(location.search).get('permission');
navigator.mediaDevices.getUserMedia = async () => {
  if (mode === 'denied') throw new DOMException('Synthetic denial', 'NotAllowedError');
  if (mode === 'pending') return new Promise(resolve => { grant = () => resolve(synthetic()); });
  return synthetic();
};
function Harness() {
  const [active, setActive] = useState(true), [state, setState] = useState('none'), [missing, setMissing] = useState(false);
  return <><h1>Synthetic non-face camera lifecycle</h1>
    <button onClick={() => setActive(false)}>Stop fixture</button>
    <button onClick={() => { grant?.(); setTimeout(() => setState(track?.readyState ?? 'none'), 20); }}>Grant synthetic permission</button>
    <button onClick={() => { track?.stop(); track?.dispatchEvent(new Event('ended')); setState(track?.readyState ?? 'none'); }}>Disconnect synthetic track</button>
    <p>Track: {state}</p><p>Missing signal: {String(missing)}</p>
    <CameraPreview isActive={active} onFrame={() => { throw new Error('Cloud must stay disabled in this fixture'); }} onLocalSnapshot={snapshot => setMissing(!snapshot.faceDetected)} />
  </>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
