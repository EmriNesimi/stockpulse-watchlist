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

// Design tokens live in the frontend, but the guard lives here: vitest stubs
// CSS imports by default, and turning that off would change what the
// component tests see from CSS Modules. This side of the repo already reads
// frontend/package.json with node:fs for the engines check, so it reads two
// more files. A token mistake is completely silent otherwise - a var() naming
// something undefined resolves to nothing, and a light token with no dark
// counterpart simply keeps its light value on a dark background.
describe("design tokens", () => {
  const tokensCss = read("frontend/src/styles/tokens.css");

  const block = (selector: string) => {
    const start = tokensCss.indexOf(selector);
    expect(start, `no ${selector} block in tokens.css`).toBeGreaterThan(-1);
    return tokensCss.slice(start, tokensCss.indexOf("}", start));
  };
  const definedIn = (css: string) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));

  const light = definedIn(block(":root {"));
  const dark = definedIn(block('[data-theme="dark"]'));

  it("defines tokens in both themes", () => {
    expect(light.size).toBeGreaterThan(0);
    expect(dark.size).toBeGreaterThan(0);
  });

  // Exactly one colour is meant to be theme-independent, and tokens.css says
  // why: the six avatar hues are identical in both themes, and dark ink is
  // the only choice clearing 3:1 on all six. Anything else turning up here is
  // a colour added to light and forgotten in dark, which fails nothing and
  // just renders the light value on a dark background.
  it("gives every light colour a dark counterpart, bar the documented one", () => {
    const missing = [...light].filter((t) => t.startsWith("--color-") && !dark.has(t)).sort();
    expect(missing).toEqual(["--color-avatar-ink"]);
  });

  it("defines no dark token that light doesn't have", () => {
    expect([...dark].filter((t) => !light.has(t)).sort()).toEqual([]);
  });

  it("names only tokens that exist, everywhere a var() is used", () => {
    const cssFiles = [
      "frontend/src/index.css",
      "frontend/src/styles/tokens.css",
      "frontend/src/App.module.css",
      ...readdirSync(resolve(repoRoot, "frontend/src/components"))
        .filter((f) => f.endsWith(".module.css"))
        .map((f) => `frontend/src/components/${f}`),
      ...readdirSync(resolve(repoRoot, "frontend/src/views"))
        .filter((f) => f.endsWith(".module.css"))
        .map((f) => `frontend/src/views/${f}`),
    ];

    const defined = new Set<string>();
    for (const f of cssFiles) for (const t of definedIn(read(f))) defined.add(t);

    const dangling: string[] = [];
    for (const f of cssFiles) {
      for (const m of read(f).matchAll(/var\((--[\w-]+)/g)) {
        if (!defined.has(m[1]!)) dangling.push(`${m[1]} in ${f}`);
      }
    }

    expect(cssFiles.length).toBeGreaterThan(5);
    expect(dangling).toEqual([]);
  });
});
