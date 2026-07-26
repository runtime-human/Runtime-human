/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

const sessionFactory = vi.hoisted(() => vi.fn());

vi.mock("../apps/desktop/src/january/create-desktop-january-session", () => ({
  getDesktopJanuarySession: sessionFactory,
}));

import { App } from "../apps/desktop/src/App";

describe("App routing lifecycle", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    const idleView = {
      kind: "idle" as const,
      saveId: parseSaveId("app-routing-save"),
      saveRevision: parseSaveRevision(0),
    };
    sessionFactory.mockResolvedValue({
      get view() {
        return idleView;
      },
      load: vi.fn(async () => idleView),
      start: vi.fn(async () => idleView),
      choose: vi.fn(async () => idleView),
      retry: vi.fn(async () => idleView),
    });
  });

  it("keeps one desktop January controller across route transitions", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Обзор карьеры" })).toBeInTheDocument();
    expect(sessionFactory).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("link", { name: /Текущий месяц/u }));

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Игровой месяц" })).toBeInTheDocument();
    });
    expect(sessionFactory).toHaveBeenCalledOnce();
  });
});
