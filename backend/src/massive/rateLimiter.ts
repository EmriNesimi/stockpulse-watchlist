const WINDOW_MS = 60_000;
// The free Massive plan allows 5 REST calls/min. Capping at 4 here on
// purpose — leaves a little headroom instead of riding the limit exactly,
// since a search-as-you-type UI plus per-symbol previous-close lookups can
// burst easily.
const MAX_CALLS_PER_WINDOW = 4;

const callTimestamps: number[] = [];

/**
 * Sliding-window limiter for outbound Massive REST calls. Returns true and
 * reserves a slot if under quota, false if the caller should skip the real
 * request this time (callers fall back to cached/static data rather than
 * queuing — a stale ticker search result is fine, a hung request isn't).
 */
export function tryConsumeMassiveQuota(): boolean {
  const now = Date.now();
  while (callTimestamps.length > 0 && now - callTimestamps[0] > WINDOW_MS) {
    callTimestamps.shift();
  }
  if (callTimestamps.length >= MAX_CALLS_PER_WINDOW) return false;
  callTimestamps.push(now);
  return true;
}
