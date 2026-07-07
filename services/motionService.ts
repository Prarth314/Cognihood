
type MotionCallback = (type: 'brake' | 'accel', magnitudeG: number) => void;

let listening = false;
let lastMagnitude = 1;
let callback: MotionCallback | null = null;

const BRAKE_THRESHOLD = 2.2;
const ACCEL_THRESHOLD = 2.0;
const COOLDOWN_MS = 3000;
let lastBrakeAt = 0;
let lastAccelAt = 0;

function handleMotion(e: DeviceMotionEvent): void {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null || a.z == null) return;

  const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const delta = mag - lastMagnitude;
  lastMagnitude = mag;
  const now = Date.now();

  if (delta < -BRAKE_THRESHOLD && now - lastBrakeAt > COOLDOWN_MS) {
    lastBrakeAt = now;
    callback?.('brake', Math.abs(delta));
  } else if (delta > ACCEL_THRESHOLD && now - lastAccelAt > COOLDOWN_MS) {
    lastAccelAt = now;
    callback?.('accel', delta);
  }
}

export function startMotionListener(cb: MotionCallback): boolean {
  if (listening) return true;
  if (!window.DeviceMotionEvent) return false;

  callback = cb;

  const attach = () => {
    window.addEventListener('devicemotion', handleMotion);
    listening = true;
  };

  const dm = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof dm.requestPermission === 'function') {
    dm.requestPermission().then(state => {
      if (state === 'granted') attach();
    }).catch(() => {});
    return true;
  }

  attach();
  return true;
}

export function stopMotionListener(): void {
  if (!listening) return;
  window.removeEventListener('devicemotion', handleMotion);
  listening = false;
  callback = null;
}

/** Desktop fallback: simulate driving events for demo when no IMU available. */
export function startSimulatedMotion(cb: MotionCallback): () => void {
  const interval = setInterval(() => {
    if (Math.random() > 0.92) {
      cb('brake', 1.5 + Math.random() * 1.5);
    }
  }, 8000);
  return () => clearInterval(interval);
}
