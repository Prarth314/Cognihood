import { createFaceTracker } from '../../services/faceTracker';
const result = document.getElementById('worker-result')!;
async function check() {
  const tracker = await createFaceTracker();
  const canvas = document.createElement('canvas'); canvas.width=640; canvas.height=480;
  canvas.getContext('2d')!.fillRect(0,0,640,480);
  const video = document.createElement('video'); video.muted=true; video.srcObject=canvas.captureStream(10);
  await video.play();
  let ticks=0; const timer=setInterval(() => ticks++,2);
  const durations: number[]=[]; let detected=false;
  try {
    for (let i=0;i<10;i++) {
      const start=performance.now(); const snapshot=await tracker.analyze(video,performance.now());
      durations.push(performance.now()-start); detected ||= Boolean(snapshot?.faceDetected);
    }
    durations.sort((a,b)=>a-b);
    result.textContent=JSON.stringify({ mode:tracker.mode, detected, ticks, p50Ms:durations[4], p95Ms:durations[9] });
  } finally { clearInterval(timer); tracker.close(); (video.srcObject as MediaStream).getTracks().forEach(track=>track.stop()); video.srcObject=null; }
}
void check().catch(error => { result.textContent=JSON.stringify({error:String(error)}); });
