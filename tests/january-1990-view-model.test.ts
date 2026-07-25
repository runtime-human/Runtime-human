import { describe, expect, it } from "vitest";

import { projectJanuary1990RuntimeView } from "@runtime-human/game-application";
import { parseMonthRunId, parseSaveId } from "@runtime-human/game-schema";

import {
  createHarnessedJanuaryRuntime,
  reachJanuaryDefectBoundary,
  reachJanuaryLearningBoundary,
  requireJanuaryCommitted,
  resumeJanuary,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

describe("January 1990 persisted runtime view model", () => {
  it("projects idle and all three durable decision boundaries", async () => {
    const source = await createHarnessedJanuaryRuntime();

    expect(projectJanuary1990RuntimeView(await source.runtime.load(source.saveId))).toEqual({
      kind: "idle",
      saveId: source.saveId,
      saveRevision: 0,
    });

    const access = await startJanuary(source.runtime, source.saveId, source.runId);
    expect(projectJanuary1990RuntimeView(access)).toMatchObject({
      kind: "access-decision",
      saveId: source.saveId,
      runId: source.runId,
      runRevision: access.checkpoint.runRevision,
      checkpointHash: access.checkpoint.checkpointHash,
    });

    const learningSource = await createHarnessedJanuaryRuntime({
      saveId: parseSaveId("save-january-view-learning"),
      runId: parseMonthRunId("run-january-view-learning"),
    });
    const learning = await reachJanuaryLearningBoundary(
      learningSource.runtime,
      learningSource.saveId,
      learningSource.runId,
    );
    expect(projectJanuary1990RuntimeView(learning).kind).toBe("learning-decision");

    const defectSource = await createHarnessedJanuaryRuntime({
      saveId: parseSaveId("save-january-view-defect"),
      runId: parseMonthRunId("run-january-view-defect"),
    });
    const defect = await reachJanuaryDefectBoundary(
      defectSource.runtime,
      defectSource.saveId,
      defectSource.runId,
    );
    expect(projectJanuary1990RuntimeView(defect).kind).toBe("defect-decision");
  });

  it("projects a committed result without exposing persistence internals", async () => {
    const source = await createHarnessedJanuaryRuntime({
      saveId: parseSaveId("save-january-view-commit"),
      runId: parseMonthRunId("run-january-view-commit"),
    });
    const defect = await reachJanuaryDefectBoundary(
      source.runtime,
      source.saveId,
      source.runId,
    );
    const committed = requireJanuaryCommitted(
      await resumeJanuary(source.runtime, defect, {
        requestId: "resume-january-view-commit",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );

    expect(projectJanuary1990RuntimeView(committed)).toMatchObject({
      kind: "committed",
      saveId: source.saveId,
      runId: source.runId,
      saveRevision: 1,
      checkpointHash: committed.checkpoint.checkpointHash,
      result: { schemaVersion: "january-1990-result-v1", month: "1990-01" },
    });
  });
});
