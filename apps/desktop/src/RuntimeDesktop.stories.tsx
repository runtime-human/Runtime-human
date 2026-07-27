import type { Meta, StoryObj } from "@storybook/react-vite";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { RuntimeDesktop } from "./RuntimeDesktop";
import { resolveDesktopRoute } from "./routing/desktop-route";
import type { JanuarySessionView } from "./january/january-session-controller";
import type { JanuarySessionState } from "./january/use-january-session";
import "./design/runtime-human-tokens.css";
import "./shell/desktop-shell.css";
import "./overview/career-overview.css";
import "./january/january-runtime.css";

const saveId = parseSaveId("storybook-routing-save");
const runId = parseMonthRunId("storybook-routing-run");
const checkpointHash = fingerprint("storybook-routing-checkpoint", { version: 1 });

function createSession(view: JanuarySessionView, busy = false): JanuarySessionState {
  return Object.freeze({
    view: Object.freeze(view),
    busy,
    start: async () => undefined,
    choose: async () => undefined,
    retry: async () => undefined,
  });
}

const idleSession = createSession({
  kind: "idle",
  saveId,
  saveRevision: parseSaveRevision(0),
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
    session: createSession({ kind: "loading" }, true),
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
    session: createSession({
      kind: "committed",
      saveId,
      runId,
      saveRevision: parseSaveRevision(1),
      checkpointHash,
      result: {
        schemaVersion: "january-1990-result-v1",
        month: "1990-01",
        projectId: "personal-utility",
        outcomeEventId: "january-1990/first-program",
        programmingOutcome: {
          schemaVersion: "january-1990-programming-outcome-v1",
          qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
        },
      },
    }),
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

export const CurrentMonth: Story = {
  args: {
    route: resolveDesktopRoute("/month/current"),
    session: idleSession,
  },
};
