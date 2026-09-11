import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlertForm from "./AlertForm";

describe("AlertForm", () => {
  it("pre-fills the threshold when a default is given", () => {
    render(<AlertForm symbol="AAPL" defaultThreshold={231.5} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Price threshold for AAPL alert")).toHaveValue(231.5);
  });

  it("leaves the threshold empty when no default is given", () => {
    render(<AlertForm symbol="AAPL" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Price threshold for AAPL alert")).toHaveValue(null);
  });

  it("defaults the direction to 'above'", () => {
    render(<AlertForm symbol="AAPL" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Alert direction")).toHaveValue("above");
  });

  it("submits the entered threshold and direction", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "200");
    await user.selectOptions(screen.getByLabelText("Alert direction"), "below");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onSubmit).toHaveBeenCalledWith(200, "below");
  });

  it("does not submit when the threshold is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a zero or negative threshold", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "-5");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a threshold over the $10M sanity ceiling", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "10000001");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a threshold right at the $10M sanity ceiling", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "10000000");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onSubmit).toHaveBeenCalledWith(10_000_000, "above");
  });

  // min/max on the input mean the browser blocks an out-of-range number with
  // its own bubble. An empty field isn't out of range and there's no required
  // attribute, so it submits, Number("") is 0, and the guard drops it in
  // silence — Set looks like a broken button.
  it("says why an empty threshold was refused", async () => {
    const user = userEvent.setup();
    render(<AlertForm symbol="AAPL" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a price/i);
  });

  it("marks the field invalid so the message is announced with it", async () => {
    const user = userEvent.setup();
    render(<AlertForm symbol="AAPL" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Price threshold for AAPL alert");

    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "alert-threshold-error");
  });

  it("clears the message once the value is corrected", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Price threshold for AAPL alert");

    await user.click(screen.getByRole("button", { name: "Set" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.type(input, "200");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set" }));
    expect(onSubmit).toHaveBeenCalledWith(200, "above");
  });

  // The message said $0.01, the guard said "anything above zero", and the input
  // attribute said 0.01. Native validation hid the disagreement by rejecting
  // out-of-range values before the handler ran.
  it("refuses a value below the floor the message states", async () => {
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Price threshold for AAPL alert");

    // Bypasses the browser's min check the way a paste or an autofill can,
    // so the guard is what's actually under test.
    fireEvent.change(input, { target: { value: "0.005" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).not.toHaveBeenCalled();
    // Both bounds formatted as currency — the floor used to interpolate as a
    // bare number next to a localised ceiling.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a price between $0.01 and $10,000,000.00."
    );
  });

  it("accepts a value exactly at the floor", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "0.01");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onSubmit).toHaveBeenCalledWith(0.01, "above");
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel setting alert" }));

    expect(onCancel).toHaveBeenCalled();
  });
});
