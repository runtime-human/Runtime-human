import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { RuntimeDesktop } from "./RuntimeDesktop";
import type { JanuarySessionView } from "./january/january-session-controller";
import { createJanuary1990ResultFixture } from "./january/january-result.fixture";
import type { JanuarySessionState } from "./january/use-january-session";
import { resolveDesktopRoute } from "./routing/desktop-route";
import "./design/runtime-human-tokens.css";
import "./shell/desktop-shell.css";
import "./shell/game-shell.css";
import "./overview/career-overview.css";
import "./january/january-runtime.css";

const saveId = parseSaveId("storybook-routing-save");
const runId = parseMonthRunId("storybook-routing-run");
const checkpointHash = fingerprint("storybook-routing-checkpoint", { version: 1 });

function createSession(view: JanuarySessionView, busy = false, ready = true): JanuarySessionState {
  return Object.freeze({
    view: Object.freeze(view),
    busy,
    ready,
    start: async () => undefined,
    choose: async () => undefined,
    retry: async () => undefined,
  });
}

function atDesktopViewport(width: number, height: number): Decorator {
  return (Story) => (
    <div data-story-viewport={`${width}x${height}`} style={{ width, height, overflow: "hidden" }}>
      <Story />
    </div>
  );
}

const idleSession = createSession({
  kind: "idle",
  saveId,
  saveRevision: parseSaveRevision(0),
});

const completedSession = createSession({
  kind: "committed",
  saveId,
  runId,
  saveRevision: parseSaveRevision(1),
  checkpointHash,
  result: createJanuary1990ResultFixture(),
});

const meta: Meta<typeof RuntimeDesktop> = {
  title: "Runtime Human/Desktop Routes",
  component: RuntimeDesktop,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    navigate: () => undefined,
    route: resolveDesktopRoute("/"),
    session: idleSession,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const OverviewLoading: Story = {
  args: {
    session: createSession({ kind: "loading" }, true, false),
  },
};

export const OverviewNewCareer: Story = {
  args: {
    session: idleSession,
  },
};

export const OverviewAccessStage: Story = {
  args: {
    session: createSession({
      kind: "access-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(2),
      checkpointHash,
      prompt: { schemaVersion: "january-access-prompt-v1" },
    }),
  },
};

export const OverviewLearningStage: Story = {
  args: {
    session: createSession({
      kind: "learning-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(4),
      checkpointHash,
      prompt: { schemaVersion: "january-learning-prompt-v1" },
    }),
  },
};

export const OverviewDefectStage: Story = {
  args: {
    session: createSession({
      kind: "defect-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(7),
      checkpointHash,
      prompt: { schemaVersion: "january-defect-prompt-v1" },
    }),
  },
};

export const OverviewCompleted: Story = {
  args: {
    session: completedSession,
  },
};

export const OverviewTerminal: Story = {
  args: {
    session: createSession({
      kind: "terminal",
      saveId,
      runId,
      checkpointHash,
      status: "recovery-required",
      reason: null,
    }),
  },
};

export const OverviewBlocked: Story = {
  args: {
    session: createSession({
      kind: "blocked",
      reason: "incompatible-checkpoint",
      message: "Скомпилированный контент не соответствует сохранённой контрольной точке.",
      saveId,
      runId,
    }),
  },
};

export const OverviewRetryableFailure: Story = {
  args: {
    session: createSession({
      kind: "rejected",
      code: "PersistenceUnavailable",
      message: "Ответ хранилища не был получен, но операция могла завершиться.",
      retryable: true,
    }),
  },
};

export const OverviewCompact1280x720: Story = {
  decorators: [atDesktopViewport(1280, 720)],
  args: {
    session: createSession({
      kind: "learning-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(4),
      checkpointHash,
      prompt: { schemaVersion: "january-learning-prompt-v1" },
    }),
  },
};

export const OverviewFull1920x1080: Story = {
  decorators: [atDesktopViewport(1920, 1080)],
  args: {
    session: completedSession,
  },
};

export const OverviewLongRussianBlocked: Story = {
  decorators: [atDesktopViewport(1280, 720)],
  args: {
    session: createSession({
      kind: "blocked",
      reason: "corrupted-checkpoint",
      message:
        "Сохранённый прогресс января повреждён и требует проверки перед продолжением. Игра оставляет данные без изменений и не подменяет причину остановки общим сообщением.",
      saveId,
      runId,
    }),
  },
};

export const CurrentMonth: Story = {
  args: {
    route: resolveDesktopRoute("/month/current"),
    session: idleSession,
  },
};
