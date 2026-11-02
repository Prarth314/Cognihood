import { createFaceTracker } from '../../services/faceTracker';
const result = document.getElementById('worker-result')!;
async function check() {
  const params = new URLSearchParams(location.search);
  const forceMain = params.get('mode') === 'main';
  const startupAt = performance.now();
  const tracker = await createFaceTracker({ forceMain });
  const startupMs = performance.now() - startupAt;
  const canvas = document.createElement('canvas'); canvas.width=640; canvas.height=480;
  canvas.getContext('2d')!.fillRect(0,0,640,480);
  const video = document.createElement('video'); video.muted=true; video.srcObject=canvas.captureStream(10);
  await video.play();
  let ticks=0; const responsiveness: number[] = []; let lastTick = performance.now();
  const timer=setInterval(() => { const now = performance.now(); responsiveness.push(now - lastTick); lastTick = now; ticks++; }, 10);
  const durations: number[]=[]; let detected=false;
  const heap = () => (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
  const heapStart = heap();
  const startedAt = performance.now();
  const requested = Number(params.get('durationMs') ?? 2000);
  const durationMs = Number.isFinite(requested) ? Math.max(2000, Math.min(120000, requested)) : 2000;
  let attempted = 0;
  try {
    while (performance.now() - startedAt < durationMs || durations.length < 10) {
      const start=performance.now(); const snapshot=await tracker.analyze(video,performance.now());
      // Deliberate overlapping calls are measured separately from camera cadence.
      attempted++;
      durations.push(performance.now()-start); detected ||= Boolean(snapshot?.faceDetected);
      const time = performance.now();
      await Promise.all([tracker.analyze(video,time), tracker.analyze(video,time + .001)]); attempted += 2;
      if (document.hidden) throw new Error('Benchmark tab became hidden; run again in a foreground controlled environment.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    durations.sort((a,b)=>a-b);
    responsiveness.sort((a,b) => a-b);
    const percentile = (values: number[], p: number) => values.length ? values[Math.ceil(values.length*p)-1] : null;
    result.textContent=JSON.stringify({ scope:'CI/synthetic non-face canvas; no camera permission or real-face accuracy', commit:__COGNI_COMMIT__, sdk:__COGNI_VISION_VERSION__,
      browser:navigator.userAgent, os:navigator.platform, logicalProcessors:navigator.hardwareConcurrency,
      device:'Unidentified runner/device; CPU model and physical memory require operator metadata',
      resolution:{width:640,height:480}, captureTargetFps:10, elapsedMs:performance.now()-startedAt,
      startupMs, mode:tracker.mode, detected, ticks, attempts:attempted, diagnostics:tracker.diagnostics(),
      p50Ms:percentile(durations,.5), p95Ms:percentile(durations,.95), mainThreadTickGapP95Ms:percentile(responsiveness,.95),
      javascriptHeap:{startBytes:heapStart,endBytes:heap(),scope:'Browser JS heap only, when exposed; excludes WASM/GPU/process memory'} });
  } finally { clearInterval(timer); tracker.close(); (video.srcObject as MediaStream).getTracks().forEach(track=>track.stop()); video.srcObject=null; }
}
void check().catch(error => { result.textContent=JSON.stringify({error:String(error)}); });
