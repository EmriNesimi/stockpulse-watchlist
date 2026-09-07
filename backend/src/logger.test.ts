import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

// The module short-circuits under NODE_ENV=test so the suite isn't buried in
// log lines — so exercising it at all means pretending not to be a test.
function capture(level: "log" | "warn" | "error", run: () => void): string {
  const spy = vi.spyOn(console, level).mockImplementation(() => {});
  vi.stubEnv("NODE_ENV", "development");
  try {
    run();
    return spy.mock.calls.at(-1)?.[0] as string;
  } finally {
    spy.mockRestore();
    vi.unstubAllEnvs();
  }
}

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("writes one line of JSON with the level, time and message", () => {
    const line = capture("log", () => logger.info("feed connected"));
    const entry = JSON.parse(line);

    expect(entry.level).toBe("info");
    expect(entry.message).toBe("feed connected");
    expect(Number.isNaN(Date.parse(entry.time))).toBe(false);
    expect(line).not.toContain("\n");
  });

  it("carries the fields it was given", () => {
    const line = capture("log", () => logger.info("subscribed", { symbol: "AAPL", clients: 3 }));

    expect(JSON.parse(line)).toMatchObject({ symbol: "AAPL", clients: 3 });
  });

  // The case that motivated the custom replacer: JSON.stringify turns an Error
  // into {}, losing the only part worth logging.
  it("does not swallow an Error into an empty object", () => {
    const line = capture("error", () => logger.error("send failed", { err: new Error("ECONNREFUSED") }));
    const entry = JSON.parse(line);

    expect(entry.err.message).toBe("ECONNREFUSED");
    expect(entry.err.stack).toContain("Error");
  });

  it("routes warnings and errors to the right console method", () => {
    expect(JSON.parse(capture("warn", () => logger.warn("slow"))).level).toBe("warn");
    expect(JSON.parse(capture("error", () => logger.error("broken"))).level).toBe("error");
  });

  it("stays silent under test so the suite isn't buried", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("should not appear");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
