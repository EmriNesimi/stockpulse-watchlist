import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatShares,
  formatSignedCurrency,
  formatSignedPercent,
} from "./format";

describe("formatSignedCurrency", () => {
  it("signs gains and losses", () => {
    expect(formatSignedCurrency(12.4)).toBe("+$12.40");
    expect(formatSignedCurrency(-12.4)).toBe("-$12.40");
  });

  // A holding down by a fraction of a cent rounds to zero, and "-$0.00" in a
  // gains column reads as a rendering bug rather than as "flat".
  it("does not sign a loss too small to show", () => {
    expect(formatSignedCurrency(-0.004)).toBe("$0.00");
  });

  it("does not sign an exact zero", () => {
    expect(formatSignedCurrency(0)).toBe("$0.00");
  });
});

describe("formatSignedPercent", () => {
  it("signs gains and losses", () => {
    expect(formatSignedPercent(1.5)).toBe("+1.50%");
    expect(formatSignedPercent(-1.5)).toBe("-1.50%");
  });

  it("does not sign a move too small to show", () => {
    expect(formatSignedPercent(-0.001)).toBe("0.00%");
    expect(formatSignedPercent(0)).toBe("0.00%");
  });
});

describe("formatCurrency", () => {
  it("always shows two decimal places", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });
});

describe("formatShares", () => {
  it("trims trailing zeros but keeps real fractions", () => {
    expect(formatShares(10)).toBe("10");
    expect(formatShares(1.5)).toBe("1.5");
  });
});
