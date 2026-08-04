import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("does not update until the delay has elapsed", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    expect(result.current).toBe("a"); // still the old value, delay hasn't passed

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a"); // one ms short, still not updated

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("resets the timer on rapid successive changes instead of updating for each one", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "abc" });
    act(() => vi.advanceTimersByTime(200)); // 400ms total, but only 200ms since the last change
    expect(result.current).toBe("a"); // never settled on "ab" — that's the point of debouncing

    act(() => vi.advanceTimersByTime(100)); // now 300ms since the last change
    expect(result.current).toBe("abc");
  });

  it("picks up a changed delay value too", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: "a", delay: 300 },
    });

    rerender({ value: "b", delay: 1000 });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("a"); // the new 1000ms delay applies, not the old 300ms

    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toBe("b");
  });
});
