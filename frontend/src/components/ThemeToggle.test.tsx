import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("shows a sun icon and 'switch to light' label when currently dark", () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("shows a moon icon and 'switch to dark' label when currently light", () => {
    render(<ThemeToggle theme="light" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ThemeToggle theme="dark" onToggle={onToggle} />);

    await user.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
