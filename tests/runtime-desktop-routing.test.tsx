/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

import { RuntimeDesktop } from "../apps/desktop/src/RuntimeDesktop";
import { resolveDesktopRoute } from "../apps/desktop/src/routing/desktop-route";
import type { JanuarySessionState } from "../apps/desktop/src/january/use-january-session";

function createSession(): JanuarySessionState {
  return {
    view: {
      kind: "idle",
      saveId: parseSaveId("routing-january-save"),
      saveRevision: parseSaveRevision(0),
    },
    busy: false,
    start: vi.fn(async () => undefined),
    choose: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
  };
}

describe("RuntimeDesktop routing composition", () => {
  it("renders an honest Overview route and navigates to the current month", () => {
    const navigate = vi.fn();
    render(
      <RuntimeDesktop
        navigate={navigate}
        route={resolveDesktopRoute("/")}
        session={createSession()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Обзор карьеры" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Разделы карьеры" });
    expect(within(navigation).getByRole("link", { name: /Обзор карьеры/u })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(within(navigation).getByRole("link", { name: /Текущий месяц/u }));

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("current-month");
  });

  it("renders the existing January workspace on the current-month route", () => {
    const session = createSession();
    render(
      <RuntimeDesktop
        navigate={() => undefined}
        route={resolveDesktopRoute("/month/current")}
        session={session}
      />,
    );

    expect(screen.getByRole("region", { name: "Игровой месяц" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Текущий месяц/u })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(screen.getByRole("button", { name: "Начать январь" }));

    expect(session.start).toHaveBeenCalledOnce();
  });
});
