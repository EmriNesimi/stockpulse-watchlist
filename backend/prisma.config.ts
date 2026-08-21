import { defineConfig } from "prisma/config";

// Prisma 7 no longer accepts `url` inside schema.prisma - the connection
// string for CLI commands (migrate, db push, studio) lives here instead, and
// the runtime client gets a driver adapter (see src/db.ts).
//
// The fallback mirrors src/env.ts so a fresh clone still works with no .env
// at all; the test harness overrides DATABASE_URL to point at a throwaway
// database, and production sets it for real.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/stockpulse_dev",
  },
});
