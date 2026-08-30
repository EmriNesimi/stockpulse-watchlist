import { Router } from "express";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../asyncHandler";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "../auth/session";
import { generateVerificationToken } from "../auth/verification";
import { accountExistsEmailHtml, passwordResetEmailHtml, sendEmail, verificationEmailHtml } from "../email/resend";
import { tryConsumeEmailQuota } from "../email/sendThrottle";
import { generateResetToken } from "../auth/passwordReset";
import { getOrCreateWatchlist } from "../watchlistHelper";
import { credentialsSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailBodySchema } from "./auth.schemas";
import { env } from "../env";

const router = Router();

// Deployed, the frontend and this API are two different onrender.com
// subdomains — and onrender.com is on the Public Suffix List, so browsers
// count them as cross-site rather than merely cross-origin. A SameSite=Lax
// cookie is set fine at login and then silently never sent back, so every
// call after it reads as signed out. Cross-site needs SameSite=None, which
// browsers only honour together with Secure.
//
// Locally both ends are localhost (ports don't affect same-site), where Lax
// works and Secure would stop the cookie working over plain http.
const isCrossSite = env.frontendOrigin.startsWith("https://");

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isCrossSite ? ("none" as const) : ("lax" as const),
  secure: isCrossSite,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

function toPublicUser(user: User) {
  return { id: user.id, email: user.email, emailVerified: user.emailVerifiedAt !== null };
}

async function sendAccountExistsEmail(email: string) {
  if (!tryConsumeEmailQuota(email)) return;

  try {
    await sendEmail(email, "Someone tried to sign up with your email", accountExistsEmailHtml(env.frontendOrigin));
  } catch (err) {
    console.error(`Failed to send account-exists email to ${email}:`, err);
  }
}

/** Returns whether the send actually succeeded, so authenticated callers can say so. */
async function sendVerificationEmail(userId: string, email: string): Promise<boolean> {
  const { token, expiresAt } = generateVerificationToken();
  await prisma.user.update({
    where: { id: userId },
    data: { verificationToken: token, verificationTokenExpires: expiresAt },
  });

  const verifyUrl = `${env.frontendOrigin}/verify-email?token=${token}`;

  // Reported as a success: the token above was still issued, so from the
  // caller's side a verification really is pending — there just isn't a second
  // email going out this soon. Returning false here would make the resend
  // route claim a delivery failure that didn't happen.
  if (!tryConsumeEmailQuota(email)) return true;
  // Swallowed on the signup path on purpose: that response has to look
  // identical whether or not the address is already registered. Callers that
  // aren't leaking anything should check the return value instead.
  try {
    await sendEmail(email, "Confirm your StockPulse account", verificationEmailHtml(verifyUrl));
    return true;
  } catch (err) {
    console.error(`Failed to send verification email to ${email}:`, err);
    return false;
  }
}

// Deliberately answers the same way whether or not the address is already
// registered, and never returns a session - an attacker submitting a list of
// emails learns nothing from the status, the body, or a Set-Cookie header.
// The cost is one extra step: you log in after signing up rather than being
// dropped straight into the app.
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }
    const { email, password } = parsed.data;

    // Hashed before we know which branch we're in, so the slow scrypt work
    // happens either way and the response time doesn't give the answer away.
    const passwordHash = await hashPassword(password);

    let created: User | null = null;
    try {
      created = await prisma.user.create({ data: { email, passwordHash } });
    } catch (err) {
      // P2002 = unique constraint on email, i.e. the account already exists.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
        throw err;
      }
    }

    if (created) {
      // Every user gets an empty watchlist up front.
      await getOrCreateWatchlist(created.id);
      await sendVerificationEmail(created.id, created.email);
    } else {
      await sendAccountExistsEmail(email);
    }

    res.status(202).json({
      // Deliberately promises nothing. The default Resend sender only reaches
      // the account owner, so for most addresses no mail ever arrives — and
      // verification gates nothing anyway, so telling people to wait for it
      // sent them looking for something that was never coming. Still worded
      // identically for a new and an existing address.
      message: "You can log in now. If a confirmation email arrives, it verifies your address — nothing depends on it.",
    });
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

    res.cookie(SESSION_COOKIE_NAME, createSessionCookieValue(user.id, user.sessionEpoch), SESSION_COOKIE_OPTIONS);
    res.json({ user: toPublicUser(user) });
  })
);

// Answers 202 no matter what, same as signup: whether an address has an
// account is not something an unauthenticated caller gets to learn, and this
// endpoint would otherwise be the easiest place to ask.
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && tryConsumeEmailQuota(email)) {
      const { token, expiresAt } = generateResetToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpires: expiresAt },
      });

      const resetUrl = `${env.frontendOrigin}/reset-password?reset=${token}`;
      try {
        await sendEmail(email, "Reset your StockPulse password", passwordResetEmailHtml(resetUrl));
      } catch (err) {
        console.error(`Failed to send password reset email to ${email}:`, err);
      }
    }

    res.status(202).json({ message: "If that address has an account, a reset link is on its way." });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }
    const { token, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    // Expiry is checked here rather than in the query so an expired token and
    // an unknown one produce the same answer.
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ error: "That reset link is invalid or has expired" });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      // Cleared in the same write that sets the password, so the token is
      // spent whether or not the user ever logs in with it.
      //
      // Bumping the epoch here is the point of a reset. Someone resetting
      // their password has usually lost control of it, and until now every
      // session opened with the old password stayed live — the reset locked
      // the front door and left whoever was already inside sitting there.
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
        sessionEpoch: { increment: 1 },
      },
    });

    // Deliberately does not sign the user in. Someone who can read the inbox
    // proves they own the address, but making them type the new password once
    // more is a cheap confirmation that they know it.
    res.status(204).send();
  })
);

// Now possible at all because sessions carry an epoch. Authenticated, so it
// only ever affects the caller's own account, and it clears the caller's
// cookie too — otherwise "sign out everywhere" would leave you holding a dead
// cookie and looking signed in until the next request failed.
router.post(
  "/logout-everywhere",
  asyncHandler(async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not signed in" });

    await prisma.user.update({
      where: { id: req.userId },
      data: { sessionEpoch: { increment: 1 } },
    });

    const { maxAge: _maxAge, ...clearOptions } = SESSION_COOKIE_OPTIONS;
    res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
    res.status(204).send();
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

    res.json({ user: toPublicUser(user) });
  })
);

// POST rather than GET: this consumes a single-use token, so it isn't a safe
// or idempotent request. A GET here could be burned by anything that
// speculatively fetches URLs - link prefetchers, corporate mail scanners -
// before the user ever clicks.
router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const parsed = verifyEmailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid or missing verification token" });
    }

    const user = await prisma.user.findUnique({ where: { verificationToken: parsed.data.token } });
    if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ error: "That verification link is invalid or has expired" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), verificationToken: null, verificationTokenExpires: null },
    });

    res.json({ user: toPublicUser({ ...user, emailVerifiedAt: new Date() }) });
  })
);

router.post(
  "/resend-verification",
  asyncHandler(async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: "Not signed in" });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (user.emailVerifiedAt) return res.status(409).json({ error: "Email is already verified" });

    // Unlike signup, this route is authenticated — it already 401s anyone who
    // isn't signed in, so it gives away nothing by admitting the send failed.
    // Reporting 204 regardless just left people waiting for mail that never
    // left the building.
    const sent = await sendVerificationEmail(user.id, user.email);
    if (!sent) {
      return res.status(502).json({ error: "We couldn't send that email just now. Please try again shortly." });
    }

    res.status(204).send();
  })
);

export default router;
