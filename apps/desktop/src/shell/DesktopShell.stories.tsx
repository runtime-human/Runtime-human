import type { Meta, StoryObj } from "@storybook/react-vite";

import { DesktopShell, type DesktopNavigationItem } from "./DesktopShell";
import "../design/runtime-human-tokens.css";
import "./desktop-shell.css";

const navigation = Object.freeze<readonly DesktopNavigationItem[]>([
  Object.freeze({
    kind: "route",
    id: "overview",
    index: "01",
    label: "Обзор карьеры",
    detail: "Текущая история",
    href: "#overview",
    current: true,
  }),
  Object.freeze({
    kind: "route",
    id: "current-month",
    index: "02",
    label: "Текущий месяц",
    detail: "Январь 1990",
    href: "#current-month",
    current: false,
  }),
  Object.freeze({ kind: "planned", id: "skills", index: "03", label: "Навыки" }),
  Object.freeze({ kind: "planned", id: "relationships", index: "04", label: "Связи" }),
]);

const meta = {
  title: "Runtime Human/Desktop Shell",
  component: DesktopShell,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    breadcrumb: "Обзор карьеры",
    era: "Персональные компьютеры",
    navigation,
    profile: "Локальная карьера",
    status: (
      <>
        <span>Локальное сохранение</span>
        <strong>Состояние сохранено</strong>
      </>
    ),
    children: (
      <section
        id="overview"
        style={{
          width: "min(var(--content-max), 100%)",
          margin: "0 auto",
          padding: "var(--stage-gutter)",
        }}
      >
        <article
          style={{
            minHeight: "32rem",
            padding: "var(--space-8)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface)",
          }}
        >
          <p style={{ color: "var(--meta)" }}>Область функции</p>
          <h1>Общий shell не зависит от игрового месяца</h1>
        </article>
      </section>
    ),
  },
} satisfies Meta<typeof DesktopShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverviewRoute: Story = {};
