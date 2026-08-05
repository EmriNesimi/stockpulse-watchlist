import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library only auto-registers this cleanup when it detects a global
// `afterEach` — our vitest.config.ts doesn't set `test.globals: true`, so
// without this explicit call, DOM from every render() call in a file piles
// up across tests, and queries like getByRole() start finding duplicates
// left over from earlier tests instead of just the current one.
afterEach(() => {
  cleanup();
});
