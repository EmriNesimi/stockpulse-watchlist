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

  // The icon rail below 1000px hides the label with display:none, which takes
  // it out of the accessibility tree. The name has to survive that.
  it("names every button independently of the visible label text", () => {
    render(<Sidebar current="dashboard" onNavigate={vi.fn()} onSignOut={vi.fn()} />);

    for (const name of ["Dashboard", "Wallet", "Profile", "Sign out"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-label", name);
    }
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
