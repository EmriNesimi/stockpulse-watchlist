import { reportClientError } from "./api";

/**
 * Reports the failures React's error boundary never sees.
 *
 * ErrorBoundary catches errors thrown during render. It does not catch a
 * rejected promise in an effect, a failed await in an event handler, or
 * anything thrown outside React's call stack — which in an app built around
 * fetches and sockets is most of what actually goes wrong. Those reached the
 * browser console and stopped there.
 */

/** Truncated to match the server's caps, so a long stack isn't rejected whole. */
const MAX = 4000;

function describe(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return { message: reason.message || reason.name, stack: reason.stack?.slice(0, MAX) };
  }
  // A rejection can carry anything at all — a string, a Response, undefined.
  // Whatever it is, saying so beats reporting "undefined" with no context.
  return { message: `Non-Error rejection: ${safeString(reason)}` };
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 200);
  try {
    return JSON.stringify(value)?.slice(0, 200) ?? String(value);
  } catch {
    // Circular, or a getter that throws. The type is still worth having.
    return Object.prototype.toString.call(value);
  }
}

let installed = false;

/**
 * Idempotent: React 19 mounts twice in development, and two listeners would
 * report every failure twice.
 */
export function installUncaughtErrorReporting(target: Window = window) {
  if (installed) return;
  installed = true;

  target.addEventListener("unhandledrejection", (event) => {
    const { message, stack } = describe(event.reason);
    reportClientError({ message, stack, url: target.location?.pathname });
  });

  target.addEventListener("error", (event) => {
    // Resource load failures (a broken <img>) also fire this, with no error
    // attached. They aren't crashes and reporting them would be noise.
    if (!event.error) return;

    const { message, stack } = describe(event.error);
    reportClientError({ message, stack, url: target.location?.pathname });
  });
}

/** Test seam — the guard above is module-level. */
export function resetUncaughtErrorReporting() {
  installed = false;
}
