import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AlertForm symbol="AAPL" onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel setting alert" }));

    expect(onCancel).toHaveBeenCalled();
  });
});
