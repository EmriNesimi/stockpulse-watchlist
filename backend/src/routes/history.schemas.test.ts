import { describe, expect, it } from "vitest";
import { historyQuerySchema } from "./history.schemas";

describe("historyQuerySchema", () => {
  it("defaults to 30 days when nothing is provided", () => {
    expect(historyQuerySchema.parse({})).toEqual({ days: 30 });
  });

  it("accepts a valid days value (coerced from the query string)", () => {
    expect(historyQuerySchema.parse({ days: "90" })).toEqual({ days: 90 });
  });

  it("rejects fewer than 7 days", () => {
    expect(historyQuerySchema.safeParse({ days: "6" }).success).toBe(false);
  });

  it("rejects more than 365 days", () => {
    expect(historyQuerySchema.safeParse({ days: "366" }).success).toBe(false);
  });

  it("rejects a non-numeric days value", () => {
    expect(historyQuerySchema.safeParse({ days: "not-a-number" }).success).toBe(false);
  });

  it("rejects a fractional days value", () => {
    expect(historyQuerySchema.safeParse({ days: "30.5" }).success).toBe(false);
  });
});
