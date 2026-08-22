// Per-recipient cooldown for outbound mail.
//
// The IP limiter on /api/auth bounds a burst but not sustained volume: 10
// requests a minute, forever, is 14,400 emails a day — and signup is
// unauthenticated and sends to whatever address is submitted, not to the
// caller. That is a mail-bomb aimed at a stranger's inbox and a fast route to
// getting the Resend account suspended. Keying the cooldown on the recipient
// instead of the sender is what actually caps what one victim can receive.
//
// In-memory on purpose: the service runs one instance (WEB_CONCURRENCY=1) and
// this is abuse mitigation, not accounting — losing the window on restart
// costs one extra email, and a shared store isn't worth the dependency. Revisit
// if this ever runs more than one process.
const COOLDOWN_MS = 15 * 60_000;

const lastSentAt = new Map<string, number>();

/**
 * Reserves a send slot for this address. Returns false if one was sent too
 * recently, in which case the caller should skip the send.
 */
export function tryConsumeEmailQuota(email: string, now: number = Date.now()): boolean {
  pruneExpired(now);

  const last = lastSentAt.get(email);
  if (last !== undefined && now - last < COOLDOWN_MS) return false;

  lastSentAt.set(email, now);
  return true;
}

// Addresses are attacker-supplied, so the map has to be swept or it grows
// without bound on exactly the traffic this is meant to defend against.
function pruneExpired(now: number) {
  for (const [email, sentAt] of lastSentAt) {
    if (now - sentAt >= COOLDOWN_MS) lastSentAt.delete(email);
  }
}

/** Test seam — the cooldown is process-global otherwise. */
export function resetEmailQuota() {
  lastSentAt.clear();
}
