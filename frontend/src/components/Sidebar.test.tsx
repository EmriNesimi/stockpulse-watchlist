import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("renders the nav items", () => {
    render(<Sidebar current="dashboard" onNavigate={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wallet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("marks the current view with aria-current", () => {
    render(<Sidebar current="wallet" onNavigate={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("keeps Dashboard highlighted while on a stock detail screen", () => {
    render(<Sidebar current="stock" onNavigate={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("calls onNavigate with the view that was clicked", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar current="dashboard" onNavigate={onNavigate} onSignOut={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Profile" }));

    expect(onNavigate).toHaveBeenCalledWith("profile");
  });

  it("calls onSignOut from the sign-out button, not onNavigate", async () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar current="dashboard" onNavigate={onNavigate} onSignOut={onSignOut} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
