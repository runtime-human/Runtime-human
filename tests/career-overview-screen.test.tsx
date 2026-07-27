/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { CareerOverviewScreen } from "../apps/desktop/src/overview/CareerOverviewScreen";

const saveId = parseSaveId("career-overview-screen-save");
const runId = parseMonthRunId("career-overview-screen-run");

describe("CareerOverviewScreen", () => {
  it("opens January from a new career", () => {
    const onOpenCurrentMonth = vi.fn();
    render(
      <CareerOverviewScreen
        onOpenCurrentMonth={onOpenCurrentMonth}
        onRetry={() => undefined}
        view={{ kind: "new-career", saveId }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Карьера готова к началу" })).toBeInTheDocument();
    expect(screen.getByText("Январь 1990")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Открыть январь" }));
    expect(onOpenCurrentMonth).toHaveBeenCalledOnce();
  });

  it("shows the persisted active stage, revision and progress", () => {
    render(
      <CareerOverviewScreen
        onOpenCurrentMonth={() => undefined}
        onRetry={() => undefined}
        view={{
          kind: "active-month",
          month: "1990-01",
          stage: "learning",
          progress: 52,
          saveId,
          runId,
          runRevision: parseMonthRunRevision(4),
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Январь продолжается" })).toBeInTheDocument();
    expect(screen.getByText("Практика")).toBeInTheDocument();
    expect(screen.getByText("Ревизия 4")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Прогресс января 52%" })).toHaveAttribute(
      "aria-valuenow",
      "52",
    );
  });

  it("shows completed quality scores with their real metric maxima", () => {
    render(
      <CareerOverviewScreen
        onOpenCurrentMonth={() => undefined}
        onRetry={() => undefined}
        view={{
          kind: "completed-month",
          month: "1990-01",
          saveId,
          runId,
          saveRevision: parseSaveRevision(1),
          qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Январь завершён" })).toBeInTheDocument();
    expect(screen.getByText("Ревизия сохранения 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Ясность" })).toHaveAttribute(
      "aria-valuemax",
      "10",
    );
    expect(screen.getByRole("progressbar", { name: "Корректность" })).toHaveAttribute(
      "aria-valuemax",
      "11",
    );
    expect(screen.getByRole("progressbar", { name: "Надёжность" })).toHaveAttribute(
      "aria-valuemax",
      "9",
    );
  });

  it("offers only the existing safe retry action for retryable rejection", () => {
    const onRetry = vi.fn();
    render(
      <CareerOverviewScreen
        onOpenCurrentMonth={() => undefined}
        onRetry={onRetry}
        view={{
          kind: "rejected",
          code: "PersistenceUnavailable",
          message: "Ответ хранилища не получен.",
          retryable: true,
        }}
      />,
    );

    expect(screen.getByText("Ответ хранилища не получен.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить безопасно" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
