import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";

/**
 * One line per finished request.
 *
 * The logs recorded failures and notable events but never the ordinary fact
 * that a request happened, which is the thing you want first: whether traffic
 * is arriving at all, what's slow, and what's failing beyond the errors that
 * reach the error handler. A 404 or a 401 never touches that handler and was
 * previously invisible.
 */
const SLOW_REQUEST_MS = 1000;

/**
 * `/health` is hit by Render's health check and by the daily smoke run, and it
 * would otherwise be most of the log by volume — drowning the requests someone
 * actually made. Failures still get through, since those are the interesting
 * case.
 */
function isRoutineNoise(path: string, status: number): boolean {
  return path === "/health" && status < 400;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  // "finish" rather than wrapping res.end: it fires once the response is
  // actually flushed, so the duration includes writing the body.
  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (isRoutineNoise(req.path, res.statusCode)) return;

    const fields = {
      method: req.method,
      // req.route?.path would give the pattern rather than the value, but it's
      // undefined for unmatched routes — and those are exactly the ones worth
      // seeing. Paths here carry ticker symbols and cuids, never credentials.
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    };

    if (res.statusCode >= 500) logger.error("request failed", fields);
    else if (res.statusCode >= 400) logger.warn("request rejected", fields);
    else if (durationMs >= SLOW_REQUEST_MS) logger.warn("slow request", fields);
    else logger.info("request", fields);
  });

  next();
}
