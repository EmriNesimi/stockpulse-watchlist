import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatShares,
  formatSignedCurrency,
  formatSignedPercent,
  signedDirection,
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

  it("groups thousands and pads cents", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  // Unsigned, unlike formatSignedCurrency - this one is for a magnitude that
  // already knows which way it points, so a minus here would double up.
  it("puts a negative inside the currency symbol rather than dropping it", () => {
    expect(formatCurrency(-12.4)).toBe("-$12.40");
  });

  it("rounds to cents rather than truncating", () => {
    expect(formatCurrency(1.005)).toBe("$1.01");
    expect(formatCurrency(1.004)).toBe("$1.00");
  });
});

describe("formatShares", () => {
  it("trims trailing zeros but keeps real fractions", () => {
    expect(formatShares(10)).toBe("10");
    expect(formatShares(1.5)).toBe("1.5");
  });

  // Fractional share counts are real - brokers sell them - so the cap is
  // four places rather than zero, and it rounds rather than truncating.
  it("keeps up to four decimal places", () => {
    expect(formatShares(0.1234)).toBe("0.1234");
    expect(formatShares(0.12345)).toBe("0.1235");
  });

  it("groups thousands, since a share count can be large", () => {
    expect(formatShares(12500)).toBe("12,500");
  });

  it("shows a zero holding as 0 rather than blank", () => {
    expect(formatShares(0)).toBe("0");
  });
});

describe("signedDirection", () => {
  it("reports real movement in both directions", () => {
    expect(signedDirection(1.5)).toBe("up");
    expect(signedDirection(-1.5)).toBe("down");
  });

  // Shares formatSignedPercent's threshold on purpose: the arrow shouldn't
  // claim a direction the number declined to sign.
  it("reports flat for a move that rounds away", () => {
    expect(signedDirection(0)).toBe("flat");
    expect(signedDirection(-0.001)).toBe("flat");
    expect(signedDirection(0.004)).toBe("flat");
  });

  it("agrees with formatSignedPercent at the boundary", () => {
    for (const v of [0.004, 0.005, -0.004, -0.005, 1, -1]) {
      const signed = formatSignedPercent(v);
      const unsigned = !signed.startsWith("+") && !signed.startsWith("-");
      expect(signedDirection(v) === "flat").toBe(unsigned);
    }
  });
});
