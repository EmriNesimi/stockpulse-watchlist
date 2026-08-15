import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VerificationBanner from "./VerificationBanner";
import { resendVerificationEmail } from "../lib/api";

vi.mock("../lib/api", () => ({
  resendVerificationEmail: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(resendVerificationEmail).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("VerificationBanner", () => {
  it("shows the please-verify message and a resend button", () => {
    render(<VerificationBanner onError={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(/verify your email/i);
    expect(screen.getByRole("button", { name: /resend email/i })).toBeInTheDocument();
  });

  it("shows a sending state, then a sent confirmation", async () => {
    let resolveResend: () => void;
    vi.mocked(resendVerificationEmail).mockReturnValue(
      new Promise((resolve) => {
        resolveResend = resolve;
      })
    );
    const user = userEvent.setup();
    render(<VerificationBanner onError={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /resend email/i }));
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();

    await act(async () => resolveResend());

    expect(screen.getByRole("button", { name: "Sent" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/check your inbox/i);
  });

  it("calls onError with the server's message when resending fails", async () => {
    vi.mocked(resendVerificationEmail).mockRejectedValue(new Error("Email is already verified"));
    const onError = vi.fn();
    const user = userEvent.setup();
    render(<VerificationBanner onError={onError} />);

    await user.click(screen.getByRole("button", { name: /resend email/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Email is already verified"));
    expect(screen.getByRole("button", { name: /resend email/i })).not.toBeDisabled();
  });

  it("re-enables the resend button after a while so a lost email can be retried", async () => {
    // fireEvent instead of userEvent here - userEvent's internal delays
    // don't play well combined with fake timers (same tradeoff Search's
    // tests document for its debounce).
    vi.useFakeTimers();
    vi.mocked(resendVerificationEmail).mockResolvedValue(undefined);
    render(<VerificationBanner onError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /resend email/i }));
    await act(async () => {}); // flush the resolved resendVerificationEmail() promise
    expect(screen.getByRole("button", { name: "Sent" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30_000));

    expect(screen.getByRole("button", { name: /resend email/i })).not.toBeDisabled();
  });
});
