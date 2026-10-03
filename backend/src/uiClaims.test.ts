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
