import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./session";

declare global {
  namespace Express {
    interface Request {
      /** Set by `attachUserId` when the session cookie is present and valid. */
      userId?: string;
    }
  }
}

// Always runs, never blocks - just resolves req.userId if there's a valid
// session cookie. Routes that need to require a signed-in user check
// req.userId themselves (see requireAuth in this same folder), since some
// routes (signup, login, /me) need to handle "not signed in" differently
// than a flat 401.
export function attachUserId(req: Request, _res: Response, next: NextFunction) {
  req.userId = verifySessionCookieValue(req.cookies?.[SESSION_COOKIE_NAME]) ?? undefined;
  next();
}

// Blocks with 401 unless attachUserId already resolved a valid session -
// put this in front of any router that needs a signed-in user.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  next();
}
