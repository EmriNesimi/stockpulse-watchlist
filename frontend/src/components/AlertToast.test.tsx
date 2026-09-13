import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlertToast from "./AlertToast";
import type { AlertEvent } from "../lib/wsMessages";

function alert(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    id: "alert-1",
    symbol: "AAPL",
    threshold: 200,
    direction: "above",
    price: 210,
    triggeredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AlertToast", () => {
  it("renders nothing when there are no alerts", () => {
    const { container } = render(<AlertToast alerts={[]} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the symbol, threshold, and current price for a fired alert", () => {
    render(<AlertToast alerts={[alert({ symbol: "AAPL", threshold: 200, price: 210 })]} onDismiss={vi.fn()} />);
    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("AAPL");
    expect(toast).toHaveTextContent("$200.00");
    expect(toast).toHaveTextContent("$210.00");
  });

  it("renders one toast per alert", () => {
    render(
      <AlertToast
        alerts={[alert({ id: "a1", symbol: "AAPL" }), alert({ id: "a2", symbol: "MSFT" })]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("calls onDismiss with the right id when its dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AlertToast
        alerts={[alert({ id: "a1", symbol: "AAPL" }), alert({ id: "a2", symbol: "MSFT" })]}
        onDismiss={onDismiss}
      />
    );

    await user.click(screen.getByRole("button", { name: "Dismiss MSFT alert" }));

    expect(onDismiss).toHaveBeenCalledWith("a2");
    expect(onDismiss).not.toHaveBeenCalledWith("a1");
  });

  it("uses aria-live semantics (role=log container) so screen readers announce new alerts", () => {
    render(<AlertToast alerts={[alert()]} onDismiss={vi.fn()} />);
    expect(screen.getByRole("log", { name: "Price alert notifications" })).toBeInTheDocument();
  });
});

describe("AlertToast number formatting", () => {
  // Thresholds go to $10,000,000 (alerts.schemas.ts). Built by hand as
  // `$${n.toFixed(2)}`, a large one rendered "$1000000.00" — unreadable, and
  // inconsistent with the wallet and profile screens, which use
  // formatCurrency and group thousands.
  it("groups thousands in the threshold and the price", () => {
    render(
      <AlertToast
        alerts={[alert({ symbol: "BRK.A", threshold: 1_000_000, price: 1_234_567.5 })]}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByText("$1,000,000.00")).toBeInTheDocument();
    expect(screen.getByText("$1,234,567.50")).toBeInTheDocument();
  });

  it("still shows two decimal places on ordinary prices", () => {
    render(<AlertToast alerts={[alert({ threshold: 200, price: 210.5 })]} onDismiss={vi.fn()} />);

    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("$210.50")).toBeInTheDocument();
  });
});
