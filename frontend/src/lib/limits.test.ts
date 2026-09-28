import { describe, expect, it } from "vitest";
import { MAX_WATCHLIST_SYMBOLS } from "./limits";
// The frontend and backend are separate TS projects with nothing shared, so
// the only way to check the mirrored number is to look at the other side's
// source. Read as text rather than imported as a module: this asserts on the
// literal in the file, and doesn't pull the backend's import graph into the
// frontend's test run.
import wsLimitsSource from "../../../backend/src/wsLimits.ts?raw";
import alertSchemasSource from "../../../backend/src/routes/alerts.schemas.ts?raw";
import watchlistSchemasSource from "../../../backend/src/routes/watchlist.schemas.ts?raw";
import holdingsFormSource from "../components/HoldingsForm.tsx?raw";
// Not exported from the component, so the frontend side is read the same way.
import alertFormSource from "../components/AlertForm.tsx?raw";

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

// Same arrangement for the alert price ceiling: the form rejects a too-large
// value before it round-trips to the server, which only stays true while
// both sides agree on what too large is.
describe("AlertForm's MAX_THRESHOLD", () => {
  it("matches MAX_THRESHOLD in backend/src/routes/alerts.schemas.ts", () => {
    expect(constantIn(alertFormSource, "MAX_THRESHOLD")).toBe(constantIn(alertSchemasSource, "MAX_THRESHOLD"));
  });
});

// And the same again for the two holdings ceilings. HoldingsForm says in its
// own header that it mirrors watchlist.schemas.ts "so a typo is caught here
// rather than round-tripping just to bounce off the same cap" - which holds
// only while the two numbers agree, and nothing was checking.
describe("HoldingsForm's ceilings", () => {
  it("matches MAX_SHARES in backend/src/routes/watchlist.schemas.ts", () => {
    expect(constantIn(holdingsFormSource, "MAX_SHARES")).toBe(constantIn(watchlistSchemasSource, "MAX_SHARES"));
  });

  it("matches MAX_COST_BASIS in backend/src/routes/watchlist.schemas.ts", () => {
    expect(constantIn(holdingsFormSource, "MAX_COST_BASIS")).toBe(
      constantIn(watchlistSchemasSource, "MAX_COST_BASIS")
    );
  });
});
