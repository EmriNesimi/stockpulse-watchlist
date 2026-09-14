import { describe, expect, it } from "vitest";
// Both packages export the version they report at runtime — which is exactly
// what React compares — so this reads the same numbers React would, without
// reaching for the filesystem or @types/node.
import { version as reactVersion } from "react";
import { version as reactDomVersion } from "react-dom";

// React and ReactDOM share internals that are versioned together, and React
// throws on a mismatch at import time:
//
//   Error: Incompatible React versions: The "react" and "react-dom" packages
//   must have the exact same version.
//
// That happened on 2026-09-13 — a dependency group bumped react to 19.3.0 and
// left react-dom on 19.2.8. Every one of the 40 test files failed to load, so
// the signal was "the entire frontend is broken" rather than "these two
// packages disagree", and working out which took installing the branch.
//
// npm can't catch it: react-dom's peer range is ^19.2.8, which 19.3.0
// satisfies, so the tree is valid by every check npm makes.
describe("react and react-dom", () => {
  it("resolve to the exact same version", () => {
    expect(
      reactDomVersion,
      `react is ${reactVersion} but react-dom is ${reactDomVersion}. These must match exactly — ` +
        "React refuses to start otherwise. Bump whichever is behind; a caret range " +
        "won't do it for you, because each is satisfied by the other's version."
    ).toBe(reactVersion);
  });
});
