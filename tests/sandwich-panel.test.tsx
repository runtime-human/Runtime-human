/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SandwichPanel, type SandwichPanelState } from "../apps/desktop/src/panels/SandwichPanel";

function renderPanel(
  state: SandwichPanelState,
  onStateChange = vi.fn<(state: SandwichPanelState) => void>(),
) {
  render(
    <SandwichPanel
      badge={<span>3</span>}
      id="events"
      onStateChange={onStateChange}
      state={state}
      summary={<p>Ближайшее событие через 3 дня</p>}
      title="События"
    >
      <button type="button">Подготовиться</button>
    </SandwichPanel>,
  );
  return onStateChange;
}

describe("SandwichPanel", () => {
  it("renders only the persistent header while collapsed", () => {
    renderPanel("collapsed");

    const toggle = screen.getByRole("button", { name: /События/u });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).not.toHaveAttribute("aria-controls");
    expect(screen.queryByText("Ближайшее событие через 3 дня")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подготовиться" })).not.toBeInTheDocument();
  });

  it("renders the summary layer without detail controls", () => {
    renderPanel("summary");

    expect(screen.getByText("Ближайшее событие через 3 дня")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Подготовиться" })).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /События/u });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).not.toHaveAttribute("aria-controls");
  });

  it("renders summary and controlled detail region while expanded", () => {
    renderPanel("expanded");

    const toggle = screen.getByRole("button", { name: /События/u });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "events-details");
    expect(screen.getByRole("region", { name: "События" })).toHaveAttribute("id", "events-details");
    expect(screen.getByRole("button", { name: "Подготовиться" })).toBeVisible();
  });

  it.each([
    ["collapsed", "summary"],
    ["summary", "expanded"],
    ["expanded", "summary"],
  ] as const)("requests %s → %s without owning state", (state, expected) => {
    const onStateChange = renderPanel(state);

    fireEvent.click(screen.getByRole("button", { name: /События/u }));

    expect(onStateChange).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenCalledWith(expected);
  });

  it("does not collapse an inline panel when Escape is pressed", () => {
    const onStateChange = renderPanel("expanded");

    fireEvent.keyDown(screen.getByRole("region", { name: "События" }), { key: "Escape" });

    expect(onStateChange).not.toHaveBeenCalled();
  });
});
