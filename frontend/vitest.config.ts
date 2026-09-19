import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Reaching above the package root is refused by default. The mirrored-limit
  // tests read the backend's source as text to check that a number copied
  // into the frontend still matches, and that file is one directory up.
  // Test-only config, so the dev server's default stays strict.
  server: { fs: { allow: [".."] } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // The default 5s is not much headroom for userEvent-driven tests, which
    // advance real timers per keystroke. Three of them intermittently ran
    // 3-5s under load and tipped over — passing on their own and on a rerun,
    // which is the signature of a timeout rather than a broken assertion.
    // Raising the ceiling makes a red run mean something went wrong rather
    // than the machine being busy.
    testTimeout: 15_000,
  },
});
