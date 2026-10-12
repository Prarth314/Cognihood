
type MotionCallback = (type: 'brake' | 'accel', magnitudeG: number) => void;

let listening = false;
let lastMagnitude = 9.80665;
let callback: MotionCallback | null = null;

const STANDARD_GRAVITY = 9.80665;
const BRAKE_THRESHOLD_G = 0.22;
const ACCEL_THRESHOLD_G = 0.2;
const COOLDOWN_MS = 3000;
let lastBrakeAt = 0;
let lastAccelAt = 0;

function handleMotion(e: DeviceMotionEvent): void {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null || a.z == null) return;

  const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const deltaG = (mag - lastMagnitude) / STANDARD_GRAVITY;
  lastMagnitude = mag;
  const now = Date.now();

  if (deltaG < -BRAKE_THRESHOLD_G && now - lastBrakeAt > COOLDOWN_MS) {
    lastBrakeAt = now;
    callback?.('brake', Math.abs(deltaG));
  } else if (deltaG > ACCEL_THRESHOLD_G && now - lastAccelAt > COOLDOWN_MS) {
    lastAccelAt = now;
    callback?.('accel', deltaG);
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
