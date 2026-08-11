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
};
