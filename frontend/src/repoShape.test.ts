import { describe, expect, it } from "vitest";

// Companion to the backend's repoShape.test.ts and to the react/react-dom
// lockstep test: claims the README makes about the layout of this package,
// which nothing else would notice becoming false.
//
// Listed with import.meta.glob rather than node:fs on purpose. This package
// has no @types/node and shouldn't gain one for a test - the lockstep test
// makes the same point in its own header. glob is Vite's own API, resolved at
// build time, and it type-checks without help.
const files = (pattern: Record<string, unknown>) =>
  Object.keys(pattern).map((p) => p.split("/").pop()!);

const componentFiles = files(import.meta.glob("./components/*"));
const viewFiles = files(import.meta.glob("./views/*"));
const hookFiles = files(import.meta.glob("./hooks/*"));

describe("components", () => {
  const components = componentFiles.filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));

  it("has some", () => {
    expect(components.length).toBeGreaterThan(0);
  });

  // The README says every component here has a matching .test.tsx, naming
  // WatchlistRow as the exception - and that exception is gone now, so there
  // isn't one. A new component arriving without a test fails here instead of
  // quietly making the claim stale.
  it("each have a colocated test", () => {
    const untested = components.filter((f) => !componentFiles.includes(f.replace(/\.tsx$/, ".test.tsx")));
    expect(untested).toEqual([]);
  });

  // Same sentence, second half. Two documented exceptions, and the list is
  // exact on purpose - a third should be a decision, not a drift.
  //   Sparkline    - SVG presentation attributes, nothing to scope.
  //   WatchlistRow - split out of WatchlistTable for memo(), and renders that
  //                  table's cells, so it shares that table's stylesheet.
  it("each have a colocated stylesheet, apart from the two that don't need one", () => {
    const withoutStyles = components
      .filter((f) => !componentFiles.includes(f.replace(/\.tsx$/, ".module.css")))
      .map((f) => f.replace(/\.tsx$/, ""))
      .sort();
    expect(withoutStyles).toEqual(["Sparkline", "WatchlistRow"]);
  });
});

describe("views", () => {
  // "one file per screen, each with a .test.tsx and .module.css" - untrue for
  // DashboardView until its test landed alongside this.
  const views = viewFiles.filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));

  it("each have a colocated test and stylesheet", () => {
    expect(views.length).toBeGreaterThan(0);
    for (const view of views) {
      expect(viewFiles, `${view} has no test`).toContain(view.replace(/\.tsx$/, ".test.tsx"));
      expect(viewFiles, `${view} has no stylesheet`).toContain(view.replace(/\.tsx$/, ".module.css"));
    }
  });
});

describe("hooks", () => {
  it("each have a colocated test", () => {
    const hooks = hookFiles.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(hooks.length).toBeGreaterThan(0);
    const untested = hooks.filter((f) => !hookFiles.includes(f.replace(/\.ts$/, ".test.ts")));
    expect(untested).toEqual([]);
  });
});
