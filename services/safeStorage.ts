/** Storage can be denied by privacy settings; preferences must not crash the app. */
export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences are optional. */
  }
}
