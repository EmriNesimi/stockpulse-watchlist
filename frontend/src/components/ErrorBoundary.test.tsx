import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import { reportClientError } from "../lib/api";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  reportClientError: vi.fn(),
}));

function Explodes(): never {
  throw new Error("price is undefined");
}

// React logs the caught error itself, which would otherwise fill the output
// with a stack for a failure the test is deliberately causing.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  // restoreAllMocks resets spies but not a vi.fn() from vi.mock, so calls
  // would otherwise carry over between tests in this file.
  vi.mocked(reportClientError).mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("shows a way out instead of a blank screen", () => {
    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // Before this, a crash reached the user's own devtools and nowhere else —
  // they saw a broken screen and nobody else ever knew it happened.
  it("reports the crash rather than only logging it locally", () => {
    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>
    );

    expect(reportClientError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reportClientError).mock.calls[0]?.[0]).toMatchObject({
      message: "price is undefined",
    });
  });

  it("sends the component stack, which is the part that says where", () => {
    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>
    );

    const report = vi.mocked(reportClientError).mock.calls[0]?.[0];
    expect(report?.componentStack).toContain("Explodes");
  });

  it("renders children untouched when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all fine</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("all fine")).toBeInTheDocument();
    expect(reportClientError).not.toHaveBeenCalled();
  });
});
