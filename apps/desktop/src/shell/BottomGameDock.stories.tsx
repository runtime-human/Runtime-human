import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import "../design/runtime-human-tokens.css";
import "./game-shell.css";
import "./bottom-game-dock.css";
import {
  BottomGameDock,
  type BottomGameDockItem,
  type BottomGameDockProps,
} from "./BottomGameDock";

const ITEMS = Object.freeze<readonly BottomGameDockItem[]>([
  Object.freeze({
    id: "status",
    label: "Состояние",
    panel: <p>Состояние сохранено локально.</p>,
  }),
  Object.freeze({
    id: "events",
    label: "События",
    panel: <p>Новых событий в текущем месяце нет.</p>,
  }),
  Object.freeze({
    id: "log",
    label: "Журнал",
    panel: <p>Журнал текущего сеанса готов к просмотру.</p>,
  }),
]);

function ControlledBottomGameDock(args: BottomGameDockProps) {
  const [activeId, setActiveId] = useState(args.activeId);

  return (
    <div style={{ height: "20rem", minWidth: 0 }}>
      <BottomGameDock {...args} activeId={activeId} onActiveChange={setActiveId} />
    </div>
  );
}

const meta = {
  title: "Runtime Human/Bottom Game Dock",
  component: BottomGameDock,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    activeId: "status",
    items: ITEMS,
    onActiveChange: () => undefined,
  },
  render: (args) => <ControlledBottomGameDock {...args} />,
} satisfies Meta<typeof BottomGameDock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongRussianLabels: Story = {
  args: {
    items: Object.freeze([
      Object.freeze({
        id: "status",
        label: "Состояние локального сохранения",
        panel: <p>Последнее локальное сохранение завершено без ошибок.</p>,
      }),
      Object.freeze({
        id: "events",
        label: "События текущего игрового месяца",
        panel: <p>Доступные события появятся здесь после изменения игрового состояния.</p>,
      }),
      Object.freeze({
        id: "log",
        label: "Подробный журнал текущего сеанса",
        panel: <p>Журнал остаётся локально прокручиваемым внутри нижнего дока.</p>,
      }),
    ] satisfies readonly BottomGameDockItem[]),
  },
};
