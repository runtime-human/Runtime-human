/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { JanuaryRuntimeScreen } from "../apps/desktop/src/january/JanuaryRuntimeScreen";

const saveId = parseSaveId("screen-january-save");
const runId = parseMonthRunId("screen-january-run");
const checkpointHash = fingerprint("screen-january-checkpoint", { version: 1 });

const handlers = {
  onStart: () => undefined,
  onRetry: () => undefined,
};

describe("January 1990 runtime screen", () => {
  it("submits the selected typed decision", () => {
    const onChoose = vi.fn();
    render(
      <JanuaryRuntimeScreen
        {...handlers}
        busy={false}
        onChoose={onChoose}
        view={{
          kind: "access-decision",
          saveId,
          runId,
          runRevision: parseMonthRunRevision(2),
          checkpointHash,
          prompt: { schemaVersion: "january-access-prompt-v1" },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Домашний компьютер/u }));

    expect(onChoose).toHaveBeenCalledOnce();
    expect(onChoose).toHaveBeenCalledWith("home-pc");
  });

  it("blocks decision controls while persistence is busy", () => {
    render(
      <JanuaryRuntimeScreen
        {...handlers}
        busy
        onChoose={() => undefined}
        view={{
          kind: "learning-decision",
          saveId,
          runId,
          runRevision: parseMonthRunRevision(4),
          checkpointHash,
          prompt: { schemaVersion: "january-learning-prompt-v1" },
        }}
      />,
    );

    expect(screen.getByRole("region", { name: "Игровой месяц" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("exposes January quality scores with their real metric ranges", () => {
    render(
      <JanuaryRuntimeScreen
        {...handlers}
        busy={false}
        onChoose={() => undefined}
        view={{
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
              qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
            },
          },
        }}
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Ясность" })).toHaveAttribute(
      "aria-valuemax",
      "10",
    );
    expect(screen.getByRole("progressbar", { name: "Корректность" })).toHaveAttribute(
      "aria-valuemax",
      "11",
    );
    expect(screen.getByRole("progressbar", { name: "Надёжность" })).toHaveAttribute(
      "aria-valuemax",
      "9",
    );
  });
});
