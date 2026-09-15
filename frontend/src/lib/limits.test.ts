import { describe, expect, it } from "vitest";
import { MAX_WATCHLIST_SYMBOLS } from "./limits";
// The frontend and backend are separate TS projects with nothing shared, so
// the only way to check the mirrored number is to look at the other side's
// source. Read as text rather than imported as a module: this asserts on the
// literal in the file, and doesn't pull the backend's import graph into the
// frontend's test run.
import wsLimitsSource from "../../../backend/src/wsLimits.ts?raw";

function constantIn(source: string, name: string): number {
  const match = source.match(new RegExp(`const ${name} = ([0-9_]+);`));
  if (!match?.[1]) throw new Error(`${name} not found as a numeric literal`);
  return Number(match[1].replace(/_/g, ""));
}

// limits.ts says it mirrors the backend and asks the reader to keep them in
// step. A comment can't fail CI; this can. If the server cap moves, the UI's
// "watchlist is full" warning would otherwise fire at the wrong count.
describe("MAX_WATCHLIST_SYMBOLS", () => {
  it("matches MAX_SYMBOLS_PER_CLIENT in backend/src/wsLimits.ts", () => {
    expect(MAX_WATCHLIST_SYMBOLS).toBe(constantIn(wsLimitsSource, "MAX_SYMBOLS_PER_CLIENT"));
  });
});
