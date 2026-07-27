/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopShell, type DesktopNavigationItem } from "../apps/desktop/src/shell/DesktopShell";

const navigation = Object.freeze<readonly DesktopNavigationItem[]>([
  Object.freeze({
    kind: "route",
    id: "overview",
    index: "01",
    label: "Обзор карьеры",
    detail: "Текущая история",
    href: "/",
    current: false,
  }),
  Object.freeze({
    kind: "route",
    id: "current-month",
    index: "02",
    label: "Текущий месяц",
    detail: "Январь 1990",
    href: "/month/current",
    current: true,
  }),
  Object.freeze({
    kind: "planned",
    id: "skills",
    index: "03",
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
    expect(within(shellNavigation).getByRole("link", { name: /Текущий месяц/u })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(shellNavigation).getByText("Навыки")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("main")).toHaveTextContent("Содержимое функции");
    expect(screen.getByRole("status", { name: "Состояние сохранения" })).toHaveTextContent(
      "Состояние сохранено",
    );
  });

  it("intercepts an unmodified route click for application navigation", () => {
    const onNavigate = vi.fn();
    render(
      <DesktopShell
        breadcrumb="Январь 1990"
        era="Персональные компьютеры"
        navigation={navigation}
        onNavigate={onNavigate}
        profile="Локальная карьера"
        status={<strong>Состояние сохранено</strong>}
      >
        <section>Содержимое функции</section>
      </DesktopShell>,
    );

    fireEvent.click(screen.getByRole("link", { name: /Обзор карьеры/u }));

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("overview");
  });

  it("preserves modified-click browser navigation", () => {
    const onNavigate = vi.fn();
    render(
      <DesktopShell
        breadcrumb="Январь 1990"
        era="Персональные компьютеры"
        navigation={navigation}
        onNavigate={onNavigate}
        profile="Локальная карьера"
        status={<strong>Состояние сохранено</strong>}
      >
        <section>Содержимое функции</section>
      </DesktopShell>,
    );

    fireEvent.click(screen.getByRole("link", { name: /Обзор карьеры/u }), { ctrlKey: true });

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
