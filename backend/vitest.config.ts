import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Route tests hit a real (throwaway) SQLite db via Prisma, never the dev
    // one — globalSetup below creates it fresh before the run and removes it
    // after.
    env: {
      // Local throwaway Postgres. globalSetup refuses anything non-local,
      // because it drops and recreates the schema before every run.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/stockpulse_test",
    },
    globalSetup: ["./src/test/globalSetup.ts"],
    // Route test files that hit the db all share the same underlying SQLite
    // file and the same single "default-user" watchlist row. Running test
    // files in parallel (vitest's default) lets one file's afterEach
    // cleanup race another file's assertions on that shared row — added a
    // second db-backed route test file (alerts) and immediately saw exactly
    // that flake. Serializing files is the simplest correct fix given how
    // small this suite is; not worth a per-file db just to parallelize.
    fileParallelism: false,
  },
});
