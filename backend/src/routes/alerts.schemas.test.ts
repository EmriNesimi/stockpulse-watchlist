import { describe, expect, it } from "vitest";
import { alertIdSchema, createAlertSchema } from "./alerts.schemas";

describe("createAlertSchema", () => {
  it("accepts a valid above alert", () => {
    const result = createAlertSchema.parse({ symbol: "aapl", threshold: 200, direction: "above" });
    expect(result).toEqual({ symbol: "AAPL", threshold: 200, direction: "above" });
  });

  it("accepts a valid below alert", () => {
    const result = createAlertSchema.parse({ symbol: "MSFT", threshold: 350.5, direction: "below" });
    expect(result.direction).toBe("below");
  });

  it("rejects a direction that isn't above/below", () => {
    expect(
      createAlertSchema.safeParse({ symbol: "AAPL", threshold: 200, direction: "sideways" }).success
    ).toBe(false);
  });

  it("rejects a zero threshold", () => {
    expect(createAlertSchema.safeParse({ symbol: "AAPL", threshold: 0, direction: "above" }).success).toBe(
      false
    );
  });

  it("rejects a negative threshold", () => {
    expect(createAlertSchema.safeParse({ symbol: "AAPL", threshold: -10, direction: "above" }).success).toBe(
      false
    );
  });

  it("rejects a non-finite threshold", () => {
    expect(
      createAlertSchema.safeParse({ symbol: "AAPL", threshold: Infinity, direction: "above" }).success
    ).toBe(false);
  });

  it("rejects an invalid ticker symbol", () => {
    expect(
      createAlertSchema.safeParse({ symbol: "NOT_VALID_123", threshold: 200, direction: "above" }).success
    ).toBe(false);
  });

  it("rejects a missing direction", () => {
    expect(createAlertSchema.safeParse({ symbol: "AAPL", threshold: 200 }).success).toBe(false);
  });
});

describe("alertIdSchema", () => {
  it("accepts a non-empty string", () => {
    expect(alertIdSchema.parse("cabc123")).toBe("cabc123");
  });

  it("rejects an empty string", () => {
    expect(alertIdSchema.safeParse("").success).toBe(false);
  });
});
