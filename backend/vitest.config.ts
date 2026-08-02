import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Route tests hit a real (throwaway) SQLite db via Prisma, never the dev
    // one — globalSetup below creates it fresh before the run and removes it
    // after.
    env: {
      DATABASE_URL: "file:./prisma/test.db",
    },
    globalSetup: ["./src/test/globalSetup.ts"],
  },
});
