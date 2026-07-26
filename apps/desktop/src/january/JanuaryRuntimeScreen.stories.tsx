import type { Meta, StoryObj } from "@storybook/react-vite";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { JanuaryRuntimeScreen } from "./JanuaryRuntimeScreen";
import "../design/runtime-human-tokens.css";
import "./january-runtime.css";

const saveId = parseSaveId("storybook-january-save");
const runId = parseMonthRunId("storybook-january-run");
const checkpointHash = fingerprint("storybook-january-checkpoint", { version: 1 });

const meta = {
  title: "Runtime Human/January 1990",
  component: JanuaryRuntimeScreen,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    busy: false,
    onStart: () => undefined,
    onChoose: () => undefined,
    onRetry: () => undefined,
  },
} satisfies Meta<typeof JanuaryRuntimeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    view: { kind: "loading" },
    busy: true,
  },
};

export const Idle: Story = {
  args: {
    view: {
      kind: "idle",
      saveId,
      saveRevision: parseSaveRevision(0),
    },
  },
};

export const AccessDecision: Story = {
  args: {
    view: {
      kind: "access-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(2),
      checkpointHash,
      prompt: { schemaVersion: "january-access-prompt-v1" },
    },
  },
};

export const LearningDecision: Story = {
  args: {
    view: {
      kind: "learning-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(4),
      checkpointHash,
      prompt: { schemaVersion: "january-learning-prompt-v1" },
    },
  },
};

export const DefectDecision: Story = {
  args: {
    view: {
      kind: "defect-decision",
      saveId,
      runId,
      runRevision: parseMonthRunRevision(7),
      checkpointHash,
      prompt: { schemaVersion: "january-defect-prompt-v1" },
    },
  },
};

export const Committed: Story = {
  args: {
    view: {
      kind: "committed",
      saveId,
      runId,
      saveRevision: parseSaveRevision(1),
      checkpointHash,
      result: {
        schemaVersion: "january-1990-result-v1",
        month: "1990-01",
        programmingOutcome: {
          schemaVersion: "january-1990-programming-outcome-v1",
          qualityScores: {
            clarity: 8,
            correctness: 10,
            reliability: 7,
          },
        },
      },
    },
  },
};

export const Blocked: Story = {
  args: {
    view: {
      kind: "blocked",
      reason: "incompatible-checkpoint",
      message: "Скомпилированный контент не соответствует сохранённой контрольной точке.",
      saveId,
      runId,
    },
  },
};

export const RetryableFailure: Story = {
  args: {
    view: {
      kind: "rejected",
      code: "PersistenceUnavailable",
      message: "Ответ хранилища не был получен, но операция могла завершиться.",
      retryable: true,
    },
  },
};
