import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useErrorToasts } from "./useErrorToasts";

describe("useErrorToasts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no errors", () => {
    const { result } = renderHook(() => useErrorToasts());
    expect(result.current.errors).toEqual([]);
  });

  it("pushes an error with a generated id", () => {
    const { result } = renderHook(() => useErrorToasts());

    act(() => result.current.pushError("Couldn't load your watchlist"));

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe("Couldn't load your watchlist");
    expect(result.current.errors[0].id).toBeTruthy();
  });

  it("supports multiple errors at once, each with a distinct id", () => {
    const { result } = renderHook(() => useErrorToasts());

    act(() => {
      result.current.pushError("first");
      result.current.pushError("second");
    });

    expect(result.current.errors).toHaveLength(2);
    expect(result.current.errors[0].id).not.toBe(result.current.errors[1].id);
  });

  it("dismisses a specific error by id, leaving the rest", () => {
    const { result } = renderHook(() => useErrorToasts());

    act(() => {
      result.current.pushError("first");
      result.current.pushError("second");
    });
    const [first, second] = result.current.errors;

    act(() => result.current.dismissError(first.id));

    expect(result.current.errors).toEqual([second]);
  });

  it("auto-dismisses an error after 6 seconds", () => {
    const { result } = renderHook(() => useErrorToasts());

    act(() => result.current.pushError("will expire"));
    expect(result.current.errors).toHaveLength(1);

    act(() => vi.advanceTimersByTime(5999));
    expect(result.current.errors).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.errors).toHaveLength(0);
  });

  it("does not error if dismissed manually before the auto-dismiss timer fires", () => {
    const { result } = renderHook(() => useErrorToasts());

    act(() => result.current.pushError("dismissed early"));
    const id = result.current.errors[0].id;

    act(() => result.current.dismissError(id));
    expect(result.current.errors).toHaveLength(0);

    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.errors).toHaveLength(0);
  });
});
