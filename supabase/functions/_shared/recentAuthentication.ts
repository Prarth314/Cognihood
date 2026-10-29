/** Inspect only AFTER the server has verified this exact bearer token with Auth.
 * Decoding is not signature verification. A refreshed iat is not a fresh password sign-in.
 */
export function hasRecentPasswordSignIn(token: string, userId: string, now = Date.now()): boolean {
  try {
    const segment = token.split('.')[1];
    const payload = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.sub !== userId || !Array.isArray(payload.amr)) return false;
    return payload.amr.some((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Record<string, unknown>;
      if (entry.method !== 'password' || typeof entry.timestamp !== 'number' || !Number.isFinite(entry.timestamp))
        return false;
      const age = now - entry.timestamp * 1000;
      return age >= -60_000 && age <= 5 * 60_000;
    });
  } catch {
    return false;
  }
}
