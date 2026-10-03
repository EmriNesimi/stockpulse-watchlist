import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

// Claims the README and index.html make about the running UI. They live over
// in the frontend; the checks live here because vitest stubs CSS imports and
// turning that off would change what the component tests see from CSS
// Modules - the same reason repoShape.test.ts holds the token guards.
//
// None of these fail a build or a type check if they drift. They are the
// sentences a reader takes on trust.

describe("touch targets", () => {
  // SC 2.5.8 asks for 24x24 CSS px. The README states the audit found touch
  // target sizes hold up throughout, which is true today - most controls are
  // at 44px, well past it. This is what notices if one drops under the floor.
  const FLOOR_PX = 24;

  it("never sets an interactive min-height below the 2.5.8 floor", () => {
    const dirs = ["frontend/src/components", "frontend/src/views"];
    const offenders: string[] = [];

    for (const dir of dirs) {
      for (const file of readdirSync(resolve(repoRoot, dir)).filter((f) => f.endsWith(".module.css"))) {
        for (const m of read(`${dir}/${file}`).matchAll(/min-height:\s*(\d+)px/g)) {
          if (Number(m[1]) < FLOOR_PX) offenders.push(`${file}: ${m[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("the reduced-motion override", () => {
  // The accessibility section's claim is specifically that every animation
  // is CSS-driven, so one blanket rule catches all of them. That only holds
  // while the rule really is blanket.
  it("still applies to every element and pseudo-element", () => {
    const css = read("frontend/src/index.css");
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

    expect(block, "the prefers-reduced-motion block is gone").toContain("prefers-reduced-motion");
    for (const selector of ["*", "*::before", "*::after"]) {
      expect(block.includes(selector), `the override no longer covers ${selector}`).toBe(true);
    }
  });
});

describe("the announcement throttle", () => {
  it("matches the rate the README quotes", () => {
    const ms = Number(read("frontend/src/hooks/useThrottledAnnouncement.ts").match(/THROTTLE_MS = (\d+)/)?.[1]);
    expect(ms, "THROTTLE_MS is no longer a plain number").toBeGreaterThan(0);

    expect(read("README.md")).toContain(`throttled to 1/${ms / 1000}s`);
  });
});
