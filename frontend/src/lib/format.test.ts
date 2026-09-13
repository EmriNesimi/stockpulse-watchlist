import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatShares,
  formatSignedCurrency,
  formatSignedPercent,
  priceDirection,
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

describe("priceDirection", () => {
  it("reports real movement in both directions", () => {
    expect(priceDirection(1.5)).toBe("up");
    expect(priceDirection(-1.5)).toBe("down");
  });

  // Shares formatSignedPercent's threshold on purpose: the arrow shouldn't
  // claim a direction the number declined to sign.
  it("reports flat for a move that rounds away", () => {
    expect(priceDirection(0)).toBe("flat");
    expect(priceDirection(-0.001)).toBe("flat");
    expect(priceDirection(0.004)).toBe("flat");
  });

  it("agrees with formatSignedPercent at the boundary", () => {
    for (const v of [0.004, 0.005, -0.004, -0.005, 1, -1]) {
      const signed = formatSignedPercent(v);
      const unsigned = !signed.startsWith("+") && !signed.startsWith("-");
      expect(priceDirection(v) === "flat").toBe(unsigned);
    }
  });
});
