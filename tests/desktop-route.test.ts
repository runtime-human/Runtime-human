import { describe, expect, it } from "vitest";

import {
  hrefForDesktopRoute,
  resolveDesktopRoute,
} from "../apps/desktop/src/routing/desktop-route";

describe("desktop route contract", () => {
  it.each([
    ["/", "overview", "/"],
    ["/month/current", "current-month", "/month/current"],
    ["/month/current/", "current-month", "/month/current"],
    ["/unknown/path", "overview", "/"],
    ["", "overview", "/"],
  ] as const)("resolves %s to %s", (pathname, id, path) => {
    expect(resolveDesktopRoute(pathname)).toEqual({ id, path });
  });

  it("returns canonical hrefs for every route", () => {
    expect(hrefForDesktopRoute("overview")).toBe("/");
    expect(hrefForDesktopRoute("current-month")).toBe("/month/current");
  });
});
