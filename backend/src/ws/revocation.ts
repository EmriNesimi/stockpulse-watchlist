/**
 * Lets the auth routes cut off a user's live WebSockets when their session
 * epoch is bumped.
 *
 * The socket resolves who you are once, during the upgrade, and caches it for
 * the life of the connection — re-checking the database on every tick would
 * be a query per client per message. That's the right trade for reads, but it
 * meant revocation only reached REST: "sign out everywhere" correctly 401'd
 * every request from the revoked device while its already-open socket carried
 * on delivering that user's private price alerts, indefinitely.
 *
 * A registry rather than an import, because the broadcaster is constructed in
 * server.ts and the routes have no handle on it.
 */
type Disconnect = (userId: string) => number;

let disconnect: Disconnect | null = null;

/** Called by attachBroadcaster once the server is wired up. */
export function registerSocketDisconnector(fn: Disconnect | null) {
  disconnect = fn;
}

/**
 * Closes every live socket belonging to this user. Returns how many were
 * closed. A no-op when no broadcaster is attached, which is the case in the
 * route tests that don't start one.
 */
export function disconnectUserSockets(userId: string): number {
  return disconnect?.(userId) ?? 0;
}
