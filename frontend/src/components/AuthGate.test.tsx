import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthGate from "./AuthGate";
import { login, requestPasswordReset, resetPassword, signup } from "../lib/api";

vi.mock("../lib/api", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(login).mockReset();
  vi.mocked(signup).mockReset();
  vi.mocked(requestPasswordReset).mockReset();
  vi.mocked(resetPassword).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthGate", () => {
  it("defaults to the login form", () => {
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);
    expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("logs in with the entered email/password and calls onAuthenticated", async () => {
    vi.mocked(login).mockResolvedValue({ user: { id: "u1", email: "trader@example.com", emailVerified: true } });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={onAuthenticated} theme="dark" onToggleTheme={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(login).toHaveBeenCalledWith("trader@example.com", "hunter22");
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: "u1", email: "trader@example.com", emailVerified: true }));
  });

  it("shows the server's error message when login fails", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid email or password"));
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password"));
  });

  it("switches to the signup form and back", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("form", { name: "Sign up" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument();
  });

  // Signup deliberately doesn't sign you in: the backend answers identically
  // whether or not the address already exists, so there's no session to
  // adopt. It drops you on the login form with a neutral message instead.
  it("signs up, then returns to the login form with the server's message", async () => {
    vi.mocked(signup).mockResolvedValue({ message: "Check your email to confirm your address, then log in." });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={onAuthenticated} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "brand-new-password");
    await user.type(screen.getByLabelText("Confirm password"), "brand-new-password");
    await user.click(screen.getByRole("button", { name: "Get started" }));

    expect(signup).toHaveBeenCalledWith("new@example.com", "brand-new-password");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Check your email to confirm your address")
    );
    expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument();
    // Never authenticated off the back of a signup.
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("shows the server's error message when signup fails (e.g. duplicate email)", async () => {
    vi.mocked(signup).mockRejectedValue(new Error("An account with that email already exists"));
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "dupe@example.com");
    await user.type(screen.getByLabelText("Password"), "some-password");
    await user.type(screen.getByLabelText("Confirm password"), "some-password");
    await user.click(screen.getByRole("button", { name: "Get started" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("An account with that email already exists")
    );
  });

  it("rejects submission when the passwords don't match, without calling signup", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "brand-new-password");
    await user.type(screen.getByLabelText("Confirm password"), "a-different-password");
    await user.click(screen.getByRole("button", { name: "Get started" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords don't match");
    expect(signup).not.toHaveBeenCalled();
  });

  it("marks the confirm-password field invalid and describes it by the error when passwords mismatch", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "brand-new-password");
    await user.type(screen.getByLabelText("Confirm password"), "a-different-password");
    await user.click(screen.getByRole("button", { name: "Get started" }));

    const confirmField = screen.getByLabelText("Confirm password");
    const errorEl = screen.getByRole("alert");
    expect(confirmField).toHaveAttribute("aria-invalid", "true");
    expect(confirmField).toHaveAttribute("aria-describedby", errorEl.id);
  });

  it("clears aria-invalid on the confirm-password field once passwords match and mode is switched", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "brand-new-password");
    await user.type(screen.getByLabelText("Confirm password"), "a-different-password");
    await user.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "false");
  });

  it("shows a success notice when verifyEmailNotice is a success", () => {
    render(
      <AuthGate
        onAuthenticated={vi.fn()}
        theme="dark"
        onToggleTheme={vi.fn()}
        verifyEmailNotice={{ kind: "success", message: "Email verified — you can log in now." }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Email verified — you can log in now.");
  });

  it("shows an error notice when verifyEmailNotice is an error", () => {
    render(
      <AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} verifyEmailNotice={{ kind: "error", message: "Link expired" }} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Link expired");
  });

  it("shows no notice when verifyEmailNotice is omitted", () => {
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("doesn't show a confirm-password field in login mode", () => {
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("clears the confirm-password field when switching back to login and forward to signup again", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Confirm password"), "leftover-text");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
  });

  it("clears a previous error when switching modes", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid email or password"));
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveLogin: (value: { user: { id: string; email: string; emailVerified: boolean } }) => void;
    vi.mocked(login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} theme="dark" onToggleTheme={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();

    resolveLogin!({ user: { id: "u1", email: "trader@example.com", emailVerified: true } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Log in" })).not.toBeDisabled());
  });
});

describe("AuthGate — password reset", () => {
  const props = { onAuthenticated: vi.fn(), theme: "dark" as const, onToggleTheme: vi.fn() };

  it("reaches the forgot form from login and asks for a link", async () => {
    const user = userEvent.setup();
    vi.mocked(requestPasswordReset).mockResolvedValue({ message: "If that address has an account, a reset link is on its way." });
    render(<AuthGate {...props} />);

    await user.click(screen.getByRole("button", { name: /forgot your password/i }));
    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestPasswordReset).toHaveBeenCalledWith("me@example.com");
    // Lands back on login showing the server's deliberately neutral wording,
    // which must not reveal whether that address exists.
    await waitFor(() => expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(/if that address has an account/i);
  });

  it("asks for a password, not an email, when arriving with a reset token", () => {
    render(<AuthGate {...props} resetToken="abc123" />);

    expect(screen.getByRole("form", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("submits the token with the new password and returns to login", async () => {
    const user = userEvent.setup();
    vi.mocked(resetPassword).mockResolvedValue(undefined);
    render(<AuthGate {...props} resetToken="abc123" />);

    await user.type(screen.getByLabelText("New password"), "correct-horse-battery");
    await user.type(screen.getByLabelText("Confirm password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(resetPassword).toHaveBeenCalledWith("abc123", "correct-horse-battery");
    await waitFor(() => expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(/log in with your new password/i);
  });

  it("won't submit mismatched passwords", async () => {
    const user = userEvent.setup();
    render(<AuthGate {...props} resetToken="abc123" />);

    await user.type(screen.getByLabelText("New password"), "correct-horse-battery");
    await user.type(screen.getByLabelText("Confirm password"), "something-else-entirely");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/passwords don't match/i);
  });

  it("surfaces a rejected token instead of claiming success", async () => {
    const user = userEvent.setup();
    vi.mocked(resetPassword).mockRejectedValue(new Error("That reset link is invalid or has expired"));
    render(<AuthGate {...props} resetToken="expired" />);

    await user.type(screen.getByLabelText("New password"), "correct-horse-battery");
    await user.type(screen.getByLabelText("Confirm password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/invalid or has expired/i));
  });
});
