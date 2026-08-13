import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthGate from "./AuthGate";
import { login, signup } from "../lib/api";

vi.mock("../lib/api", () => ({
  login: vi.fn(),
  signup: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(login).mockReset();
  vi.mocked(signup).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthGate", () => {
  it("defaults to the login form", () => {
    render(<AuthGate onAuthenticated={vi.fn()} />);
    expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("logs in with the entered email/password and calls onAuthenticated", async () => {
    vi.mocked(login).mockResolvedValue({ user: { id: "u1", email: "trader@example.com" } });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(login).toHaveBeenCalledWith("trader@example.com", "hunter22");
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: "u1", email: "trader@example.com" }));
  });

  it("shows the server's error message when login fails", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid email or password"));
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password"));
  });

  it("switches to the signup form and back", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("form", { name: "Sign up" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByRole("form", { name: "Log in" })).toBeInTheDocument();
  });

  it("signs up with the entered email/password and calls onAuthenticated", async () => {
    vi.mocked(signup).mockResolvedValue({ user: { id: "u2", email: "new@example.com" } });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "brand-new-password");
    await user.type(screen.getByLabelText("Confirm password"), "brand-new-password");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(signup).toHaveBeenCalledWith("new@example.com", "brand-new-password");
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: "u2", email: "new@example.com" }));
  });

  it("shows the server's error message when signup fails (e.g. duplicate email)", async () => {
    vi.mocked(signup).mockRejectedValue(new Error("An account with that email already exists"));
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "dupe@example.com");
    await user.type(screen.getByLabelText("Password"), "some-password");
    await user.type(screen.getByLabelText("Confirm password"), "some-password");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("An account with that email already exists")
    );
  });

  it("rejects submission when the passwords don't match, without calling signup", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "brand-new-password");
    await user.type(screen.getByLabelText("Confirm password"), "a-different-password");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords don't match");
    expect(signup).not.toHaveBeenCalled();
  });

  it("doesn't show a confirm-password field in login mode", () => {
    render(<AuthGate onAuthenticated={vi.fn()} />);
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("clears the confirm-password field when switching back to login and forward to signup again", async () => {
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Confirm password"), "leftover-text");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByLabelText("Confirm password")).toHaveValue("");
  });

  it("clears a previous error when switching modes", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Invalid email or password"));
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveLogin: (value: { user: { id: string; email: string } }) => void;
    vi.mocked(login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );
    const user = userEvent.setup();
    render(<AuthGate onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trader@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();

    resolveLogin!({ user: { id: "u1", email: "trader@example.com" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Log in" })).not.toBeDisabled());
  });
});
