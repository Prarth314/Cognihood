import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPreference, writePreference } from './safeStorage';
afterEach(() => vi.unstubAllGlobals());
describe('optional preference storage', () => {
  it('does not crash when browser storage is denied', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
    });
    expect(readPreference('theme')).toBeNull();
    expect(() => writePreference('theme', 'light')).not.toThrow();
  });
});
