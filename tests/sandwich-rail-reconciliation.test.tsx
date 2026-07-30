/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { SandwichRail } from "../apps/desktop/src/panels/SandwichRail";

function InlinePromotedRail() {
  const [renders, setRenders] = useState(0);
  return (
    <>
      <button onClick={() => setRenders((current) => current + 1)} type="button">
        Перерисовать {renders}
      </button>
      <SandwichRail
        ariaLabel="Контекст игры"
        items={[
          {
            id: "events",
            title: "События",
            initialState: "summary",
            summary: <p>Контрольная через 5 дней</p>,
            content: <button type="button">Подготовиться</button>,
          },
          {
            id: "finance",
            title: "Финансы",
            initialState: "collapsed",
            summary: <p>Доступно 125 рублей</p>,
            content: <button type="button">Открыть бюджет</button>,
          },
        ]}
        promotedId="events"
      />
    </>
  );
}

function DynamicRail() {
  const [includeFinance, setIncludeFinance] = useState(false);
  const items = [
    {
      id: "events",
      title: "События",
      initialState: "expanded" as const,
      summary: <p>Контрольная через 5 дней</p>,
      content: <button type="button">Подготовиться</button>,
    },
    ...(includeFinance
      ? [
          {
            id: "finance",
            title: "Финансы",
            initialState: "expanded" as const,
            summary: <p>Доступно 125 рублей</p>,
            content: <button type="button">Открыть бюджет</button>,
          },
        ]
      : []),
  ];

  return (
    <>
      <button onClick={() => setIncludeFinance(true)} type="button">
        Добавить финансы
      </button>
      <SandwichRail ariaLabel="Контекст игры" items={items} />
    </>
  );
}

describe("SandwichRail reconciliation", () => {
  it("does not loop or re-promote when an inline item array is recreated", () => {
    render(<InlinePromotedRail />);

    expect(screen.getByRole("button", { name: "Подготовиться" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Перерисовать/u }));
    expect(screen.getByRole("button", { name: "Подготовиться" })).toBeVisible();
  });

  it("reconciles new items while retaining only one expanded detail layer", () => {
    render(<DynamicRail />);

    fireEvent.click(screen.getByRole("button", { name: "Добавить финансы" }));

    expect(screen.getByRole("button", { name: "Подготовиться" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Открыть бюджет" })).not.toBeInTheDocument();
    expect(screen.getByText("Доступно 125 рублей")).toBeVisible();
  });
});
