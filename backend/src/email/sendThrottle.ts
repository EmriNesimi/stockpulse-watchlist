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
const WINDOW_MS = 15 * 60_000;

// Three per window rather than one, and this is the important number.
//
// One meant a single request consumed the address's entire allowance, which
// made the throttle a suppression tool: anyone who knew a registered address
// could call forgot-password every fourteen minutes and the real owner's reset
// email would be silently dropped — answered 202 like any other, with nothing
// to say it hadn't been sent. Worst exactly when it matters, since someone
// resetting a password is often trying to lock an intruder out.
//
// Three still isn't a mail bomb (twelve an hour, ceiling), but an attacker now
// has to burn every slot in every window to keep the owner out rather than
// winning with one request.
const MAX_PER_WINDOW = 3;

interface Window {
  count: number;
  startedAt: number;
}

const windows = new Map<string, Window>();

/**
 * Reserves a send slot for this address. Returns false if one was sent too
 * recently, in which case the caller should skip the send.
 */
export function tryConsumeEmailQuota(email: string, now: number = Date.now()): boolean {
  pruneExpired(now);

  // Every caller today passes an address that credentialsSchema already
  // lowercased, so this changes nothing now. It's here because the window is
  // keyed by string: the day someone throttles an address that didn't come
  // through that schema, "Me@example.com" would open a second window on the
  // same mailbox and quietly double what one victim can be sent. A control
  // shouldn't depend on its callers remembering that.
  const key = email.toLowerCase();

  const current = windows.get(key);
  if (current === undefined || now - current.startedAt >= WINDOW_MS) {
    windows.set(key, { count: 1, startedAt: now });
    return true;
  }

  if (current.count >= MAX_PER_WINDOW) return false;

  current.count += 1;
  return true;
}

// Addresses are attacker-supplied, so the map has to be swept or it grows
// without bound on exactly the traffic this is meant to defend against.
function pruneExpired(now: number) {
  for (const [email, window] of windows) {
    if (now - window.startedAt >= WINDOW_MS) windows.delete(email);
  }
}

/** Test seam — the cooldown is process-global otherwise. */
export function resetEmailQuota() {
  windows.clear();
}
