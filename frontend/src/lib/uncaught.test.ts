import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportClientError } from "./api";
import { installUncaughtErrorReporting, resetUncaughtErrorReporting } from "./uncaught";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  reportClientError: vi.fn(),
}));

beforeEach(() => {
  resetUncaughtErrorReporting();
  vi.mocked(reportClientError).mockClear();
});

afterEach(() => vi.restoreAllMocks());

/** Stands in for window: jsdom won't let us fire a real unhandledrejection. */
function fakeWindow() {
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  return {
    location: { pathname: "/dashboard" },
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      (listeners[type] ??= []).push(fn);
    },
    fire: (type: string, event: unknown) => listeners[type]?.forEach((fn) => fn(event)),
    count: (type: string) => listeners[type]?.length ?? 0,
  };
}

describe("installUncaughtErrorReporting", () => {
  // The gap it exists for: ErrorBoundary only catches errors thrown during
  // render, and in an app built on fetches most failures aren't.
  it("reports a rejected promise that nothing caught", () => {
    const win = fakeWindow();
    installUncaughtErrorReporting(win as unknown as Window);

    win.fire("unhandledrejection", { reason: new Error("fetch failed") });

    expect(reportClientError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "fetch failed", url: "/dashboard" })
    );
  });

  it("reports an uncaught throw outside React", () => {
    const win = fakeWindow();
    installUncaughtErrorReporting(win as unknown as Window);

    win.fire("error", { error: new Error("boom") });

    expect(reportClientError).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
  });

  // A broken <img> fires the same event with no error attached. That isn't a
  // crash, and reporting it would bury the ones that are.
  it("ignores a resource load failure", () => {
    const win = fakeWindow();
    installUncaughtErrorReporting(win as unknown as Window);

    win.fire("error", { error: null });

    expect(reportClientError).not.toHaveBeenCalled();
  });

  // A rejection can carry anything — a string, a Response, undefined.
  it("describes a non-Error rejection instead of reporting nothing useful", () => {
    const win = fakeWindow();
    installUncaughtErrorReporting(win as unknown as Window);

    win.fire("unhandledrejection", { reason: { status: 500 } });

    const report = vi.mocked(reportClientError).mock.calls[0]?.[0];
    expect(report?.message).toContain("Non-Error rejection");
    expect(report?.message).toContain("500");
  });

  it("survives a reason that can't be stringified", () => {
    const win = fakeWindow();
    installUncaughtErrorReporting(win as unknown as Window);

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => win.fire("unhandledrejection", { reason: circular })).not.toThrow();
    expect(reportClientError).toHaveBeenCalled();
  });

  // React 19 mounts twice in development; two listeners would double-report.
  it("installs once even if called twice", () => {
    const win = fakeWindow();
    installUncaughtErrorReporting(win as unknown as Window);
    installUncaughtErrorReporting(win as unknown as Window);

    expect(win.count("unhandledrejection")).toBe(1);
  });
});
