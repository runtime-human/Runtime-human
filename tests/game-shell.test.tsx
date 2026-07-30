/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GameShell } from "../apps/desktop/src/shell/GameShell";

describe("GameShell", () => {
  it("renders one fixed five-zone game composition", () => {
    const { container } = render(
      <GameShell
        bottomDock={<div>Dock content</div>}
        contextRail={<div>Context content</div>}
        playerRail={<div>Player content</div>}
        scene={<div>Scene content</div>}
        topHud={<div>HUD content</div>}
      />,
    );

    expect(container.firstElementChild).toHaveAttribute("data-layout", "game-shell");
    expect(screen.getByRole("banner", { name: "Игровой интерфейс" })).toHaveTextContent(
      "HUD content",
    );
    expect(screen.getByRole("complementary", { name: "Состояние персонажа" })).toHaveTextContent(
      "Player content",
    );
    expect(screen.getByRole("main", { name: "Игровая сцена" })).toHaveTextContent("Scene content");
    expect(screen.getByRole("complementary", { name: "Контекст игры" })).toHaveTextContent(
      "Context content",
    );
    expect(screen.getByRole("region", { name: "Игровой док" })).toHaveTextContent("Dock content");
  });
});
