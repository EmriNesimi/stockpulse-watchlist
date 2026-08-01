import { describe, expect, it } from "vitest";
import { searchQuerySchema } from "./search.schemas";

describe("searchQuerySchema", () => {
  it("accepts a normal query", () => {
    expect(searchQuerySchema.parse({ q: "apple" })).toEqual({ q: "apple" });
  });

  it("trims whitespace", () => {
    expect(searchQuerySchema.parse({ q: "  apple  " })).toEqual({ q: "apple" });
  });

  it("rejects a missing q param", () => {
    expect(searchQuerySchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(false);
  });

  it("rejects a query over 50 characters", () => {
    expect(searchQuerySchema.safeParse({ q: "a".repeat(51) }).success).toBe(false);
  });
});
