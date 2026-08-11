import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorToast from "./ErrorToast";
import type { ErrorToastEvent } from "../hooks/useErrorToasts";

function error(overrides: Partial<ErrorToastEvent> = {}): ErrorToastEvent {
  return { id: "err-1", message: "Couldn't load your watchlist", ...overrides };
}

describe("ErrorToast", () => {
  it("renders nothing when there are no errors", () => {
    const { container } = render(<ErrorToast errors={[]} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the error message", () => {
    render(<ErrorToast errors={[error({ message: "Couldn't add AAPL" })]} onDismiss={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't add AAPL");
  });

  it("renders one toast per error", () => {
    render(
      <ErrorToast
        errors={[error({ id: "e1", message: "first" }), error({ id: "e2", message: "second" })]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("calls onDismiss with the right id when its dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ErrorToast
        errors={[error({ id: "e1", message: "first" }), error({ id: "e2", message: "second" })]}
        onDismiss={onDismiss}
      />
    );

    await user.click(screen.getByRole("button", { name: "Dismiss error: second" }));

    expect(onDismiss).toHaveBeenCalledWith("e2");
    expect(onDismiss).not.toHaveBeenCalledWith("e1");
  });

  it("uses aria-live semantics (role=log container) so screen readers announce new errors", () => {
    render(<ErrorToast errors={[error()]} onDismiss={vi.fn()} />);
    expect(screen.getByRole("log", { name: "Error notifications" })).toBeInTheDocument();
  });
});
