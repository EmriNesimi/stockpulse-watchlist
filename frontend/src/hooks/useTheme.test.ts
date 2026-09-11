import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("useTheme", () => {
  it("defaults to light when nothing is stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("toggles between light and dark", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("persists the choice to localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());

    expect(window.localStorage.getItem("stockpulse-theme")).toBe("dark");
  });

  it("reads a previously-stored theme on mount instead of defaulting", () => {
    window.localStorage.setItem("stockpulse-theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores a garbage stored value and falls back to light", () => {
    window.localStorage.setItem("stockpulse-theme", "purple");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
  });
});

describe("useTheme when storage is unavailable", () => {
  // Blocking site data makes localStorage throw SecurityError on access —
  // not return null. Safari's private mode is the classic case, but any
  // browser with cookies blocked for the site does it. The read ran inside a
  // useState initializer, so the throw came out of the first render and took
  // the whole app down over a colour preference.
  function breakStorage(method: "getItem" | "setItem") {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
  }

  afterEach(() => vi.restoreAllMocks());

  it("still renders when reading the stored theme throws", () => {
    breakStorage("getItem");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("still toggles when persisting the choice throws", () => {
    breakStorage("setItem");

    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());

    // The preference doesn't survive a reload, which is the most that can be
    // done without storage. The theme still changes.
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
