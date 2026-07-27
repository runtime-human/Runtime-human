import type { Meta, StoryObj } from "@storybook/react-vite";

import { parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

import { RuntimeDesktop } from "./RuntimeDesktop";
import { resolveDesktopRoute } from "./routing/desktop-route";
import type { JanuarySessionState } from "./january/use-january-session";
import "./design/runtime-human-tokens.css";
import "./shell/desktop-shell.css";
import "./overview/career-overview.css";
import "./january/january-runtime.css";

const session = Object.freeze<JanuarySessionState>({
  view: Object.freeze({
    kind: "idle",
    saveId: parseSaveId("storybook-routing-save"),
    saveRevision: parseSaveRevision(0),
  }),
  busy: false,
  start: async () => undefined,
  choose: async () => undefined,
  retry: async () => undefined,
});

const meta = {
  title: "Runtime Human/Desktop Routes",
  component: RuntimeDesktop,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    navigate: () => undefined,
    session,
  },
} satisfies Meta<typeof RuntimeDesktop>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CareerOverview: Story = {
  args: {
    route: resolveDesktopRoute("/"),
  },
};

export const CurrentMonth: Story = {
  args: {
    route: resolveDesktopRoute("/month/current"),
  },
};
