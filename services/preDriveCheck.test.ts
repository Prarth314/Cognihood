import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluatePreDriveCheck, PRE_DRIVE_SCAN_MS } from './preDriveCheck';
import { LocalFaceSnapshot } from '../types';

afterEach(() => vi.useRealTimers());

function samples(count: number, closed = false): LocalFaceSnapshot[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => ({
    timestamp: now - (count - index) * 100,
    ear: closed ? 0.12 : 0.3,
    eyesClosed: closed,
    blinkDetected: false,
    headPose: { pitch: index % 3, yaw: index % 5, roll: 0 },
    faceDetected: true,
  }));
}

describe('evaluatePreDriveCheck', () => {
  it('does not pass before the scan duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));
    const result = evaluatePreDriveCheck(samples(40), Date.now() - PRE_DRIVE_SCAN_MS + 1000);
    expect(result.passed).toBe(false);
  });

  it('rejects sustained eye closure after the scan', () => {
    const result = evaluatePreDriveCheck(samples(60, true), Date.now() - PRE_DRIVE_SCAN_MS - 1000);
    expect(result.passed).toBe(false);
    expect(result.perclos).toBeGreaterThanOrEqual(15);
  });
});
