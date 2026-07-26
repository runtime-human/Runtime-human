/** @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DesktopShell,
  type DesktopNavigationItem,
} from "../apps/desktop/src/shell/DesktopShell";

const navigation = Object.freeze<readonly DesktopNavigationItem[]>([
  Object.freeze({
    kind: "route",
    id: "current-month",
    index: "01",
    label: "Текущий месяц",
    detail: "Январь 1990",
    href: "#current-month",
    current: true,
  }),
  Object.freeze({
    kind: "planned",
    id: "skills",
    index: "02",
    label: "Навыки",
  }),
]);

describe("DesktopShell", () => {
  it("renders a typed current route, planned section, feature content, and status", () => {
    render(
      <DesktopShell
        breadcrumb="Январь 1990"
        era="Персональные компьютеры"
        navigation={navigation}
        profile="Локальная карьера"
        status={<strong>Состояние сохранено</strong>}
      >
        <section>Содержимое функции</section>
      </DesktopShell>,
    );

    const shellNavigation = screen.getByRole("navigation", { name: "Разделы карьеры" });
    expect(
      within(shellNavigation).getByRole("link", { name: /Текущий месяц/u }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(shellNavigation).getByText("Навыки")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("main")).toHaveTextContent("Содержимое функции");
    expect(screen.getByRole("status", { name: "Состояние сохранения" })).toHaveTextContent(
      "Состояние сохранено",
    );
  });
});
