/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BottomGameDock,
  type BottomGameDockItem,
} from "../apps/desktop/src/shell/BottomGameDock";

const ITEMS = Object.freeze<readonly BottomGameDockItem[]>([
  Object.freeze({ id: "status", label: "Состояние", panel: <p>Сохранение завершено</p> }),
  Object.freeze({ id: "events", label: "События", panel: <p>Событий пока нет</p> }),
  Object.freeze({ id: "log", label: "Журнал", panel: <p>Журнал сеанса</p> }),
]);

describe("BottomGameDock", () => {
  it("renders one controlled tab panel and keeps inactive content out of the document", () => {
    render(<BottomGameDock activeId="events" items={ITEMS} onActiveChange={() => undefined} />);

    const tabs = screen.getAllByRole("tab");
    const activeTab = screen.getByRole("tab", { name: "События" });
    const panel = screen.getByRole("tabpanel");

    expect(screen.getByRole("tablist", { name: "Игровой док" })).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Состояние" })).toHaveAttribute("tabindex", "-1");
    expect(panel).toHaveTextContent("Событий пока нет");
    expect(activeTab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", activeTab.id);
    expect(screen.queryByText("Сохранение завершено")).not.toBeInTheDocument();
    expect(screen.queryByText("Журнал сеанса")).not.toBeInTheDocument();
  });

  it("moves roving focus with arrows and Home/End without changing the active tab", () => {
    const onActiveChange = vi.fn();
    render(<BottomGameDock activeId="status" items={ITEMS} onActiveChange={onActiveChange} />);

    const status = screen.getByRole("tab", { name: "Состояние" });
    const events = screen.getByRole("tab", { name: "События" });
    const log = screen.getByRole("tab", { name: "Журнал" });

    status.focus();
    fireEvent.keyDown(status, { key: "ArrowLeft" });
    expect(log).toHaveFocus();
    expect(log).toHaveAttribute("tabindex", "0");
    expect(status).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(log, { key: "ArrowRight" });
    expect(status).toHaveFocus();
    expect(status).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(status, { key: "End" });
    expect(log).toHaveFocus();
    expect(log).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(log, { key: "Home" });
    expect(status).toHaveFocus();
    expect(status).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(status, { key: "ArrowRight" });
    expect(events).toHaveFocus();
    expect(events).toHaveAttribute("tabindex", "0");
    expect(status).toHaveAttribute("tabindex", "-1");
    expect(onActiveChange).not.toHaveBeenCalled();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Сохранение завершено");
  });

  it("requests controlled activation from click, Enter and Space", () => {
    const onActiveChange = vi.fn();
    render(<BottomGameDock activeId="status" items={ITEMS} onActiveChange={onActiveChange} />);

    const events = screen.getByRole("tab", { name: "События" });
    const log = screen.getByRole("tab", { name: "Журнал" });

    fireEvent.click(events);
    expect(events).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(events, { key: "Enter" });
    fireEvent.keyDown(log, { key: " " });

    expect(onActiveChange.mock.calls).toEqual([["events"], ["events"], ["log"]]);
  });

  it("updates the selected tab, roving focus and panel when controlled state changes", () => {
    const { rerender } = render(
      <BottomGameDock activeId="status" items={ITEMS} onActiveChange={() => undefined} />,
    );

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Сохранение завершено");

    rerender(<BottomGameDock activeId="log" items={ITEMS} onActiveChange={() => undefined} />);

    expect(screen.getByRole("tab", { name: "Журнал" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Журнал" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Журнал сеанса");
    expect(screen.queryByText("Сохранение завершено")).not.toBeInTheDocument();
  });
});