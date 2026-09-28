import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

// Guards on the shape of the repo rather than on its behaviour, in the same
// spirit as the frontend's react/react-dom lockstep and mirrored-limit tests:
// things a README says are true, that nothing would notice becoming false.

describe("every backend *.schemas.ts has a test", () => {
  // clientErrors.schemas.ts went without one for weeks, on the one route that
  // is unauthenticated. The caps in a schema are load bearing; a schema file
  // nobody tests is a gap that's invisible until it matters.
  it("leaves no schema file untested", () => {
    const routes = resolve(repoRoot, "backend/src/routes");
    const schemas = readdirSync(routes).filter((f) => f.endsWith(".schemas.ts"));
    const untested = schemas.filter((f) => !readdirSync(routes).includes(f.replace(/\.ts$/, ".test.ts")));

    expect(schemas.length).toBeGreaterThan(0);
    expect(untested).toEqual([]);
  });
});
