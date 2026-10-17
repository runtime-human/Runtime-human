/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { parseMonthRunId, parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

import { RuntimeDesktop } from "../apps/desktop/src/RuntimeDesktop";
import type { JanuarySessionView } from "../apps/desktop/src/january/january-session-controller";
import type { JanuarySessionState } from "../apps/desktop/src/january/use-january-session";
import { resolveDesktopRoute } from "../apps/desktop/src/routing/desktop-route";

function createSession(
  view: JanuarySessionView = {
    kind: "idle",
    saveId: parseSaveId("routing-january-save"),
    saveRevision: parseSaveRevision(0),
  },
  busy = false,
): JanuarySessionState {
  return {
    view,
    busy,
    ready: true,
    start: vi.fn(async () => undefined),
    choose: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
  };
}

function renderStatus(session: JanuarySessionState) {
  render(
    <RuntimeDesktop
      navigate={() => undefined}
      route={resolveDesktopRoute("/month/current")}
      session={session}
    />,
  );
  return screen.getByRole("status", { name: "Состояние сохранения" });
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

    const overview = screen.getByRole("region", { name: "Обзор карьеры" });
    expect(within(overview).getByRole("heading", { name: "Обзор карьеры" })).toBeInTheDocument();
    expect(within(overview).getByText("Готов к началу")).toBeInTheDocument();
    expect(
      within(overview).queryByRole("button", { name: "Начать январь" }),
    ).not.toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Разделы карьеры" });
    expect(within(navigation).getByRole("link", { name: /Обзор карьеры/u })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(screen.getByRole("button", { name: "Открыть январь" }));

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

  describe("save status", () => {
    it("confirms the save only when the view carries a persisted revision", () => {
      const status = renderStatus(createSession());
      expect(within(status).getByText("Сохранено локально")).toBeInTheDocument();
      expect(status.querySelector("[data-save-state]")).toHaveAttribute(
        "data-save-state",
        "confirmed",
      );
    });

    it("does not claim a save for a blocked recovery view even when not busy", () => {
      const status = renderStatus(
        createSession({
          kind: "blocked",
          reason: "recovery",
          message: "Нужно восстановление.",
          saveId: parseSaveId("routing-january-save"),
          runId: parseMonthRunId("routing-january-run"),
        }),
      );
      expect(status).not.toHaveTextContent("Сохранено локально");
      expect(within(status).getByText("Сохранение требует внимания")).toBeInTheDocument();
      expect(status.querySelector("[data-save-state]")).toHaveAttribute(
        "data-save-state",
        "attention",
      );
    });

    it("does not claim a save for retryable and non-retryable rejections", () => {
      const retryable = renderStatus(
        createSession({
          kind: "rejected",
          code: "PersistenceUnavailable",
          message: "Ответ хранилища не получен.",
          retryable: true,
        }),
      );
      expect(retryable).not.toHaveTextContent("Сохранено локально");
      expect(retryable).toHaveTextContent("Сохранение не подтверждено · можно повторить");
    });

    it("does not claim a save after a bootstrap failure", () => {
      const status = renderStatus(
        createSession({
          kind: "rejected",
          code: "DesktopBootstrapFailure",
          message: "Не удалось запустить игровой сеанс",
          retryable: false,
        }),
      );
      expect(status).not.toHaveTextContent("Сохранено локально");
      expect(status.querySelector("[data-save-state]")).toHaveAttribute(
        "data-save-state",
        "not-confirmed",
      );
    });

    it("shows writing while busy instead of a confirmed state", () => {
      const status = renderStatus(createSession(undefined, true));
      expect(status).not.toHaveTextContent("Сохранено локально");
      expect(status).toHaveTextContent("Сохраняем…");
    });
  });
});
