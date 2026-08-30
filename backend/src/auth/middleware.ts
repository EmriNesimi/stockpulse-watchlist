import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db";
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
export async function attachUserId(req: Request, _res: Response, next: NextFunction) {
  const session = verifySessionCookieValue(req.cookies?.[SESSION_COOKIE_NAME]);
  if (!session) return next();

  // A valid signature only proves we issued the cookie, not that it's still
  // good. Revocation needs server-side state to compare against, so this
  // costs one indexed lookup on every authenticated request — the price of
  // being able to sign someone out of a device you don't control.
  const user = await prisma.user
    .findUnique({ where: { id: session.userId }, select: { sessionEpoch: true } })
    .catch(() => null);

  // Treated as signed out rather than thrown: a deleted user, or a database
  // blip, shouldn't 500 a route that only wanted to know who you are.
  if (!user || user.sessionEpoch !== session.epoch) return next();

  req.userId = session.userId;
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
