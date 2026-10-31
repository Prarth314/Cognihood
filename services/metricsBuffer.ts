
import { LocalFaceSnapshot } from '../types';

const MAX_BUFFER_AGE_MS = 120_000;
const MAX_SAMPLES = 2400; // Two minutes at twice the scheduled 10 Hz cadence.

export class MetricsBuffer {
  private snapshots: LocalFaceSnapshot[] = [];

  add(snapshot: LocalFaceSnapshot): void {
    const now = Date.now();
    if (!Number.isFinite(snapshot.timestamp) || snapshot.timestamp > now || snapshot.timestamp < now - MAX_BUFFER_AGE_MS) return;
    const latest = this.getLatest();
    // Arrival order is part of the live contract; never let a delayed response
    // replace the newest observation. Offline replay sorts its own input.
    if (latest && snapshot.timestamp <= latest.timestamp) return;
    this.snapshots.push(snapshot);
    this.prune();
    if (this.snapshots.length > MAX_SAMPLES) this.snapshots.splice(0, this.snapshots.length - MAX_SAMPLES);
  }

  getInWindow(windowMs: number): LocalFaceSnapshot[] {
    const cutoff = Date.now() - windowMs;
    return this.snapshots.filter(s => s.timestamp >= cutoff);
  }

  getLatest(): LocalFaceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  clear(): void {
    this.snapshots = [];
  }

  private prune(): void {
    const cutoff = Date.now() - MAX_BUFFER_AGE_MS;
    this.snapshots = this.snapshots.filter(s => s.timestamp >= cutoff);
  }
}
