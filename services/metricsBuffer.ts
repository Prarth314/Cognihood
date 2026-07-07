
import { LocalFaceSnapshot } from '../types';

const MAX_BUFFER_AGE_MS = 120_000;

export class MetricsBuffer {
  private snapshots: LocalFaceSnapshot[] = [];

  add(snapshot: LocalFaceSnapshot): void {
    this.snapshots.push(snapshot);
    this.prune();
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
