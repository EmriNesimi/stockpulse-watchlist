import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// env is read at module load, so each case needs a fresh import of both this
// module and the env it closes over.
//
// "No key" is an empty string rather than a deleted variable on purpose:
// env.ts imports dotenv/config, and dotenv fills in any key that isn't
// already present - so deleting it on a machine with a real backend/.env
// hands the test the developer's own key and it quietly asserts nothing.
// An empty string counts as present, and env.ts maps it to undefined.
async function createFeedWithKey(key: string) {
  vi.resetModules();
  process.env.MASSIVE_API_KEY = key;
  const { createPriceFeed } = await import("./index.js");
  return createPriceFeed();
}

describe("createPriceFeed", () => {
  const original = process.env.MASSIVE_API_KEY;

  beforeEach(() => vi.resetModules());
  afterEach(() => {
    if (original === undefined) delete process.env.MASSIVE_API_KEY;
    else process.env.MASSIVE_API_KEY = original;
    vi.resetModules();
  });

  it("uses the simulated feed when there's no key", async () => {
    const feed = await createFeedWithKey("");
    expect(feed.constructor.name).toBe("SimulatedFeed");
  });

  it("uses the live feed when a key is set", async () => {
    const feed = await createFeedWithKey("test-key-not-real");
    expect(feed.constructor.name).toBe("MassiveLiveFeed");
  });

  // env.ts trims and treats blank as absent. A key set to whitespace by a
  // half-filled .env should boot the simulated feed, not a live one that
  // will fail auth and fall back anyway.
  it("treats a blank key as no key", async () => {
    const feed = await createFeedWithKey("   ");
    expect(feed.constructor.name).toBe("SimulatedFeed");
  });

  it("returns something satisfying the PriceFeed contract either way", async () => {
    for (const key of ["", "test-key-not-real"]) {
      const feed = await createFeedWithKey(key);
      expect(typeof feed.subscribe).toBe("function");
    }
  });
});
