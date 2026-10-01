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

// tickerColor.ts picks one of six hues by hash and emits
// var(--avatar-hue-N). The count lives in that file as a constant and the
// hues live in tokens.css, with nothing connecting them - raise one without
// the other and some symbols get an avatar with no colour at all. Same
// mirrored-constant shape as MAX_WATCHLIST_SYMBOLS, which already has a
// guard on the frontend side.
describe("avatar hues", () => {
  it("defines exactly as many as tickerColor.ts hands out", () => {
    const tokens = read("frontend/src/styles/tokens.css");
    const source = read("frontend/src/lib/tickerColor.ts");

    const defined = new Set([...tokens.matchAll(/--avatar-hue-(\d+)\s*:/g)].map((m) => Number(m[1])));
    const hueCount = Number(source.match(/const HUE_COUNT = (\d+);/)?.[1]);

    expect(hueCount, "HUE_COUNT is not a plain numeric literal any more").toBeGreaterThan(0);
    expect(defined.size).toBe(hueCount);
    // and they're 1..N with no gaps, since the index is (hash % N) + 1
    expect([...defined].sort((a, b) => a - b)).toEqual(Array.from({ length: hueCount }, (_, i) => i + 1));
  });
});
// The README quotes numbers that live in code - the watchlist cap, the
// history range, the alert ceiling, the tick budget. Every one of them has
// drifted at some point and been fixed by hand afterwards, which only works
// while somebody is reading carefully. These are the ones stated as bare
// figures in prose, where a reader has no reason to doubt them.
describe("numbers the README quotes", () => {
  const readme = read("README.md");
  const numberIn = (source: string, name: string) => {
    const match = source.match(new RegExp(`${name} = ([0-9_]+)`));
    expect(match?.[1], `${name} is not a plain numeric literal any more`).toBeTruthy();
    return Number(match![1]!.replace(/_/g, ""));
  };

  it("states the watchlist cap as the code enforces it", () => {
    const cap = numberIn(read("backend/src/wsLimits.ts"), "MAX_SYMBOLS_PER_CLIENT");
    expect(readme).toContain(`Capped at ${cap} tickers`);
    expect(readme).toContain(`Limits: ${cap} subscribed symbols`);
  });

  it("states the two API rate limits as app.ts sets them", () => {
    const app = read("backend/src/app.ts");
    const limits = [...app.matchAll(/limit: (\d+),/g)].map((m) => Number(m[1]));
    expect(limits.length, "app.ts no longer declares two numeric limits").toBe(2);
    const [general, auth] = limits;

    expect(readme).toContain(`${general} req/min, ${auth}/min on \`/api/auth\``);
  });

  it("states the WebSocket payload cap as the broadcaster sets it", () => {
    const broadcaster = read("backend/src/ws/broadcaster.ts");
    const bytes = broadcaster.match(/MAX_PAYLOAD_BYTES = (\d+) \* 1024/)?.[1];
    expect(bytes, "MAX_PAYLOAD_BYTES is no longer written as N * 1024").toBeTruthy();

    expect(readme).toContain(`${bytes}KB max message size`);
  });

  it("states the JSON body cap as app.ts sets it", () => {
    const cap = read("backend/src/app.ts").match(/express\.json\(\{ limit: "(\w+)" \}\)/)?.[1];
    expect(cap, "express.json's limit is no longer a plain string").toBeTruthy();

    expect(readme).toContain(`bounded by the ${cap} JSON limit`);
  });

  it("states the Massive call budget as the limiter sets it", () => {
    const budget = numberIn(read("backend/src/massive/rateLimiter.ts"), "MAX_CALLS_PER_WINDOW");

    // Stated twice: once in the tree, once in the architecture note, both as
    // "4/min" against the free tier's 5.
    expect(readme).toContain(`capped at ${budget}/min`);
    expect(readme).toContain(`caps itself at ${budget}/min`);
  });

  it("states both token lifetimes as the generators set them", () => {
    const hours = (source: string, name: string) => {
      const match = source.match(new RegExp(`${name} = ([^;]+);`));
      expect(match?.[1], `${name} is no longer a plain expression`).toBeTruthy();
      // The literals are written as arithmetic - 24 * 60 * 60 * 1000 - so
      // evaluate rather than trying to read a number out of them.
      const ms = match![1]!.split("*").map((p) => Number(p.trim())).reduce((a, b) => a * b, 1);
      return ms / (60 * 60 * 1000);
    };

    const verification = hours(read("backend/src/auth/verification.ts"), "VERIFICATION_TOKEN_TTL_MS");
    const reset = hours(read("backend/src/auth/passwordReset.ts"), "RESET_TOKEN_TTL_MS");

    expect(readme).toContain(`${verification}h email verification token`);
    expect(readme).toContain(`${reset}h reset token`);
    // The ordering is the actual security claim, not the two numbers.
    expect(reset).toBeLessThan(verification);
  });

  it("states the shutdown grace as server.ts sets it", () => {
    const ms = numberIn(read("backend/src/server.ts"), "SHUTDOWN_GRACE_MS");
    expect(readme).toContain(`SIGTERM drains for ${ms / 1000}s then exits`);
  });

  it("keeps the Massive budget strictly under the free tier it quotes", () => {
    const budget = numberIn(read("backend/src/massive/rateLimiter.ts"), "MAX_CALLS_PER_WINDOW");
    const freeTier = Number(readme.match(/free tier is rate-limited \((\d+) REST calls\/min\)/)?.[1]);

    expect(freeTier, "the env table no longer quotes the free-tier figure").toBeGreaterThan(0);
    // The limiter exists to sit under the ceiling, not at it. Raising it to
    // match would technically agree with the prose and defeat the point.
    expect(budget).toBeLessThan(freeTier);
  });

  it("states the client-error field caps as the schema sets them", () => {
    const schema = read("backend/src/routes/clientErrors.schemas.ts");
    const caps = [...schema.matchAll(/\.max\((\d+)\)/g)].map((m) => Number(m[1]));
    expect(caps.length, "clientErrors.schemas.ts no longer caps with plain numbers").toBeGreaterThan(0);

    // The README doesn't quote the numbers, and shouldn't - it says every
    // field is length-capped, which is the claim worth keeping true. So
    // assert the claim rather than any figure: no field uncapped.
    const fields = [...schema.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    expect(fields.length).toBeGreaterThan(0);
    expect(caps.length).toBe(fields.length);
    expect(readme).toContain("every field is length-capped");
  });

  it("states the WebSocket budget as the broadcaster enforces it", () => {
    const broadcaster = read("backend/src/ws/broadcaster.ts");
    const perMinute = numberIn(broadcaster, "MAX_MESSAGES_PER_MINUTE");
    const perIp = numberIn(broadcaster, "MAX_CONNECTIONS_PER_IP");

    expect(readme).toContain(`${perMinute} messages/min and ${perIp} concurrent connections per IP`);
  });

  it("states the sparkline history length as useLiveTicks keeps it", () => {
    const length = numberIn(read("frontend/src/hooks/useLiveTicks.ts"), "HISTORY_LENGTH");
    expect(readme).toContain(`a rolling ${length}-point price history`);
  });

  it("states the alert ceiling as the schema enforces it", () => {
    const ceiling = numberIn(read("backend/src/routes/alerts.schemas.ts"), "MAX_THRESHOLD");
    // Written as $10M in prose rather than the raw figure, so compare the
    // millions rather than the digits.
    expect(readme).toContain(`\u2264 $${ceiling / 1_000_000}M`);
  });

  it("states the history range as the schema enforces it", () => {
    const schema = read("backend/src/routes/history.schemas.ts");
    const min = Number(schema.match(/\.min\((\d+)\)/)?.[1]);
    const max = Number(schema.match(/\.max\((\d+)\)/)?.[1]);
    const fallback = Number(schema.match(/\.default\((\d+)\)/)?.[1]);

    expect([min, max, fallback].every(Number.isFinite), "history.schemas.ts no longer reads as plain numbers").toBe(true);
    expect(readme).toContain(`?days=<${min}-${max}, default ${fallback}>`);
    expect(readme).toContain(`${min}-${max}, default ${fallback}`);
  });
});

// CSS hygiene, over in the frontend, guarded from here for the same reason
// the token checks are: vitest stubs CSS imports, and turning that off would
// change what the component tests see from CSS Modules.
//
// A stylesheet is the one place nothing complains. An unused rule costs a
// little bundle and a lot of confusion later; a token nobody references is
// dead weight; a class the markup stopped using leaves a reader guessing
// which of two similar rules is live.
describe("css hygiene", () => {
  const frontend = resolve(repoRoot, "frontend/src");

  const walk = (dir: string, suffix: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) return walk(full, suffix);
      return e.name.endsWith(suffix) && !e.name.includes(".test.") ? [full] : [];
    });

  const stylesheets = walk(frontend, ".module.css");
  const sources = [...walk(frontend, ".tsx"), ...walk(frontend, ".ts")];

  // Which component(s) actually import each stylesheet - by following the
  // import, not by matching filenames. App.module.css is imported by
  // Dashboard.tsx, so pairing on name gets that one wrong.
  const importersOf = (sheet: string) =>
    sources.filter((src) => {
      const rel = readFileSync(src, "utf8").match(/import\s+styles\s+from\s+"([^"]+\.module\.css)"/)?.[1];
      return rel !== undefined && resolve(src, "..", rel) === sheet;
    });

  it("imports every stylesheet from somewhere", () => {
    const orphans = stylesheets.filter((s) => importersOf(s).length === 0).map((s) => s.split("/").pop());
    expect(stylesheets.length).toBeGreaterThan(10);
    expect(orphans).toEqual([]);
  });

  it("uses every class it defines", () => {
    const dead: string[] = [];
    for (const sheet of stylesheets) {
      const classes = [...readFileSync(sheet, "utf8").matchAll(/^\.([A-Za-z][\w-]*)/gm)].map((m) => m[1]!);
      const markup = importersOf(sheet).map((f) => readFileSync(f, "utf8")).join("");
      const used = new Set([
        ...[...markup.matchAll(/styles\.([A-Za-z]\w*)/g)].map((m) => m[1]!),
        ...[...markup.matchAll(/styles\["([^"]+)"\]/g)].map((m) => m[1]!),
      ]);
      for (const c of classes) if (!used.has(c)) dead.push(`${sheet.split("/").pop()} .${c}`);
    }
    expect(dead).toEqual([]);
  });

  it("references every design token it defines", () => {
    const allCss = walk(frontend, ".css");
    const defined = new Set<string>();
    for (const f of allCss) {
      for (const m of readFileSync(f, "utf8").matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]!);
    }
    const text = [...allCss, ...sources].map((f) => readFileSync(f, "utf8")).join("");
    const used = new Set([...text.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!));

    // The avatar hues are the documented exception: tickerColor.ts builds
    // the name at runtime as var(--avatar-hue-${n}), so no literal reference
    // to hues 2..6 exists anywhere. Their count is pinned separately, above.
    const unused = [...defined].filter((t) => !used.has(t) && !/^--avatar-hue-\d+$/.test(t)).sort();
    expect(defined.size).toBeGreaterThan(20);
    expect(unused).toEqual([]);
  });
});
