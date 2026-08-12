import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../asyncHandler";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "../auth/session";
import { getOrCreateWatchlist } from "../watchlistHelper";
import { credentialsSchema } from "./auth.schemas";
import { env } from "../env";

const router = Router();

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.frontendOrigin.startsWith("https://"),
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }
    const { email, password } = parsed.data;

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await prisma.user.create({ data: { email, passwordHash } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({ error: "An account with that email already exists" });
      }
      throw err;
    }

    // Every user gets an empty watchlist up front, same as the old
    // single-user "default-user" flow did implicitly.
    await getOrCreateWatchlist(user.id);

    res.cookie(SESSION_COOKIE_NAME, createSessionCookieValue(user.id), SESSION_COOKIE_OPTIONS);
    res.status(201).json({ user: { id: user.id, email: user.email } });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Same error either way - don't reveal whether the email is registered.
    const invalidCredentials = () => res.status(401).json({ error: "Invalid email or password" });

    if (!user) return invalidCredentials();
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return invalidCredentials();

    res.cookie(SESSION_COOKIE_NAME, createSessionCookieValue(user.id), SESSION_COOKIE_OPTIONS);
    res.json({ user: { id: user.id, email: user.email } });
  })
);

router.post("/logout", (_req, res) => {
  // clearCookie needs the same attributes the cookie was set with (path,
  // sameSite, secure) to actually match and clear it, but passing maxAge is
  // deprecated in Express 4.x since clearCookie always expires immediately.
  const { maxAge: _maxAge, ...clearOptions } = SESSION_COOKIE_OPTIONS;
  res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
  res.status(204).send();
});

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not signed in" });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: "Not signed in" });

    res.json({ user: { id: user.id, email: user.email } });
  })
);

export default router;
