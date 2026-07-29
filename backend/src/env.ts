import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  polygonApiKey: process.env.POLYGON_API_KEY?.trim() || undefined,
  databaseUrl: required("DATABASE_URL", "file:./prisma/dev.db"),
  frontendOrigin: required("FRONTEND_ORIGIN", "http://localhost:5173"),
};
