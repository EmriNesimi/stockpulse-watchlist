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

describe(".nvmrc", () => {
  // Deploy gotcha #3 in the README: Render reads .nvmrc from the service's
  // root directory, CI reads it from the repo root. Three copies have to say
  // the same thing, and nothing checked that they did.
  const paths = [".nvmrc", "backend/.nvmrc", "frontend/.nvmrc"];

  it("exists in all three places Render and CI look", () => {
    for (const p of paths) expect(() => read(p), `${p} is missing`).not.toThrow();
  });

  it("pins the same version in all three", () => {
    const versions = paths.map((p) => read(p).trim());
    expect(new Set(versions).size, `mismatched: ${versions.join(", ")}`).toBe(1);
  });

  it("pins an exact version rather than a range", () => {
    expect(read(".nvmrc").trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("satisfies the engines range both packages declare", () => {
    const [major, minor] = read(".nvmrc").trim().split(".").map(Number);
    for (const pkg of ["backend", "frontend"]) {
      const engines = JSON.parse(read(`${pkg}/package.json`)).engines?.node as string;
      expect(engines, `${pkg} declares no engines.node`).toBeTruthy();
      // Every range in use here is of the form ^20.19.0 (optionally || >=22.12.0).
      const lowest = engines.match(/\^(\d+)\.(\d+)/);
      expect(lowest, `${pkg}: unrecognised engines range ${engines}`).not.toBeNull();
      expect(major, `${pkg}: .nvmrc major ${major} vs engines ${engines}`).toBe(Number(lowest![1]));
      expect(minor, `${pkg}: .nvmrc minor ${minor} vs engines ${engines}`).toBeGreaterThanOrEqual(Number(lowest![2]));
    }
  });
});

describe("render.yaml", () => {
  const blueprint = read("render.yaml");

  // The one deploy trap the README calls out twice: Render appends a random
  // suffix when a service name is taken, so the live hosts are
  // stockpulse-b449 and stockpulse-api-n3yu. FRONTEND_ORIGIN and VITE_API_URL
  // are pinned to those exact hosts, and if either service is recreated both
  // values have to move together or CORS silently refuses every request.
  function valueOf(key: string): string {
    const match = blueprint.match(new RegExp(`- key: ${key}\\n\\s+value: (\\S+)`));
    if (!match?.[1]) throw new Error(`${key} has no literal value in render.yaml`);
    return match[1];
  }

  it("points FRONTEND_ORIGIN and VITE_API_URL at full https origins", () => {
    for (const key of ["FRONTEND_ORIGIN", "VITE_API_URL"]) {
      expect(valueOf(key)).toMatch(/^https:\/\/[^/]+$/);
    }
  });

  it("gives VITE_API_URL no trailing slash, since ws.ts appends to it", () => {
    expect(valueOf("VITE_API_URL").endsWith("/")).toBe(false);
  });

  it("keeps the two services in the same region as the database", () => {
    const regions = [...blueprint.matchAll(/^\s+region: (\S+)/gm)].map((m) => m[1]);
    if (regions.length > 1) expect(new Set(regions).size).toBe(1);
  });

  it("never commits a literal value for the two secrets", () => {
    for (const key of ["MASSIVE_API_KEY", "RESEND_API_KEY"]) {
      expect(blueprint).toMatch(new RegExp(`- key: ${key}\\n\\s+sync: false`));
    }
  });
});
