/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDesktopRoute } from "../apps/desktop/src/routing/use-desktop-route";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("useDesktopRoute", () => {
  it("initializes from the current pathname and navigates with pushState", () => {
    window.history.replaceState({}, "", "/month/current");
    const { result } = renderHook(() => useDesktopRoute());

    expect(result.current.route.id).toBe("current-month");

    act(() => result.current.navigate("overview"));

    expect(window.location.pathname).toBe("/");
    expect(result.current.route.id).toBe("overview");
  });

  it("updates from popstate without creating another history entry", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useDesktopRoute());

    act(() => {
      window.history.replaceState({}, "", "/month/current");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current.route.id).toBe("current-month");
    expect(pushState).not.toHaveBeenCalled();
  });

  it("does not push a duplicate entry for the active route", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useDesktopRoute());

    act(() => result.current.navigate("overview"));

    expect(pushState).not.toHaveBeenCalled();
  });
});
