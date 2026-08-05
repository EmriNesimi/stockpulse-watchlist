import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConnectionBadge from "./ConnectionBadge";

describe("ConnectionBadge", () => {
  it("shows 'Connecting…' while connecting", () => {
    render(<ConnectionBadge status="connecting" />);
    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
  });

  it("shows 'Connected' when open", () => {
    render(<ConnectionBadge status="open" />);
    expect(screen.getByRole("status")).toHaveTextContent("Connected");
  });

  it("shows 'Reconnecting…' while reconnecting", () => {
    render(<ConnectionBadge status="reconnecting" />);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });

  it("shows 'Disconnected' when closed", () => {
    render(<ConnectionBadge status="closed" />);
    expect(screen.getByRole("status")).toHaveTextContent("Disconnected");
  });

  it("only applies the spin animation class while reconnecting", () => {
    const { container: reconnecting } = render(<ConnectionBadge status="reconnecting" />);
    expect(reconnecting.querySelector("svg")).toHaveClass("spin");

    const { container: open } = render(<ConnectionBadge status="open" />);
    expect(open.querySelector("svg")).not.toHaveClass("spin");
  });
});
