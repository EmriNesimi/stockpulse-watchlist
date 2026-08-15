import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TickerAvatar from "./TickerAvatar";

describe("TickerAvatar", () => {
  it("shows the first two letters of the symbol", () => {
    render(<TickerAvatar symbol="AAPL" />);
    expect(screen.getByText("AA")).toBeInTheDocument();
  });

  it("strips share-class suffixes like .B or -B before taking initials", () => {
    render(<TickerAvatar symbol="BRK.B" />);
    expect(screen.getByText("BR")).toBeInTheDocument();
  });

  it("is decorative - hidden from screen readers since the symbol text is shown right next to it", () => {
    render(<TickerAvatar symbol="AAPL" />);
    expect(screen.getByText("AA")).toHaveAttribute("aria-hidden", "true");
  });

  it("respects a custom size", () => {
    render(<TickerAvatar symbol="AAPL" size={48} />);
    expect(screen.getByText("AA")).toHaveStyle({ width: "48px", height: "48px" });
  });
});
