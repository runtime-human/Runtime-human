/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
} from "@runtime-human/game-schema";

import { JanuaryRuntimeScreen } from "../apps/desktop/src/january/JanuaryRuntimeScreen";

describe("January reference scene", () => {
  it("uses the existing scenario choices and current-month chronology", () => {
    const onChoose = vi.fn();
    render(
      <JanuaryRuntimeScreen
        busy={false}
        onChoose={onChoose}
        onRetry={() => undefined}
        onStart={() => undefined}
        view={{
          kind: "defect-decision",
          saveId: parseSaveId("reference-stage-save"),
          runId: parseMonthRunId("reference-stage-run"),
          runRevision: parseMonthRunRevision(7),
          checkpointHash: fingerprint("reference-stage-checkpoint", { version: 1 }),
          prompt: { schemaVersion: "january-defect-prompt-v1" },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Январь 1990" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Варианты решения" })).toBeInTheDocument();
    expect(screen.getByLabelText("Хронология первого месяца")).toHaveTextContent(
      "ЯНВ · Первая программа",
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByText("Guardian")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Попросить объяснение/u }));
    expect(onChoose).toHaveBeenCalledOnce();
    expect(onChoose).toHaveBeenCalledWith("ask-for-guidance");
  });
});
