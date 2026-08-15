import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

// The fallback is a dev convenience only — in production a missing var
// should fail loudly at boot, not silently start against the wrong
// database or CORS origin.
function required(name: string, devFallback?: string): string {
  const value = process.env[name] ?? (isProduction ? undefined : devFallback);
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  // Massive is the market-data provider (formerly branded Polygon.io — same
  // account/API, they renamed in Oct 2025). Var name reflects the new brand.
  massiveApiKey: process.env.MASSIVE_API_KEY?.trim() || undefined,
  databaseUrl: required("DATABASE_URL", "file:./prisma/dev.db"),
  frontendOrigin: required("FRONTEND_ORIGIN", "http://localhost:5173"),
  // Signs the session cookie (see src/auth/session.ts). Dev fallback is
  // fine for local use, but a fixed value would let anyone forge a session
  // in production, hence the same production fail-fast as the vars above.
  sessionSecret: required("SESSION_SECRET", "dev-only-session-secret-do-not-use-in-production"),
  // Optional, same pattern as massiveApiKey: verification emails just don't
  // send without it (signup/login still work fine) instead of the app
  // refusing to boot over a non-critical feature.
  resendApiKey: process.env.RESEND_API_KEY?.trim() || undefined,
  resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "StockPulse <onboarding@resend.dev>",
};
