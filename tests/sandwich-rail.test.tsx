/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SandwichRail } from "../apps/desktop/src/panels/SandwichRail";

const items = [
  {
    id: "events",
    title: "События",
    initialState: "summary" as const,
    summary: <p>Контрольная через 5 дней</p>,
    content: <button type="button">Подготовиться</button>,
  },
  {
    id: "finance",
    title: "Финансы",
    initialState: "collapsed" as const,
    summary: <p>Доступно 125 рублей</p>,
    content: <button type="button">Открыть бюджет</button>,
  },
  {
    id: "processes",
    title: "Постоянные процессы",
    initialState: "collapsed" as const,
    content: <p>Учёба в школе</p>,
  },
] as const;

describe("SandwichRail", () => {
  it("exposes one named semantic rail region", () => {
    render(<SandwichRail ariaLabel="Контекст игры" items={items} />);

    expect(screen.getByRole("region", { name: "Контекст игры" })).toBeVisible();
  });

  it("expands only one detail layer and demotes the previous panel to summary", () => {
    render(<SandwichRail ariaLabel="Контекст игры" items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /События/u }));
    expect(screen.getByRole("button", { name: "Подготовиться" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Финансы/u }));
    fireEvent.click(screen.getByRole("button", { name: /Финансы/u }));

    expect(screen.getByRole("button", { name: "Открыть бюджет" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Подготовиться" })).not.toBeInTheDocument();
    expect(screen.getByText("Контрольная через 5 дней")).toBeVisible();
  });

  it("promotes a critical panel without stealing keyboard focus", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const { rerender } = render(<SandwichRail ariaLabel="Контекст игры" items={items} />);

    rerender(<SandwichRail ariaLabel="Контекст игры" items={items} promotedId="events" />);

    expect(screen.getByRole("button", { name: "Подготовиться" })).toBeVisible();
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
  });

  it("keeps a panel without summary collapsed when another panel expands", () => {
    render(<SandwichRail ariaLabel="Контекст игры" items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /Финансы/u }));
    fireEvent.click(screen.getByRole("button", { name: /Финансы/u }));

    expect(screen.queryByText("Учёба в школе")).not.toBeInTheDocument();
  });
});
