import { describe, expect, it } from "vitest";

import {
  createJanuarySessionController,
  type JanuarySessionController,
} from "../apps/desktop/src/january/january-session-controller";
import {
  createHarnessedJanuaryRuntime,
} from "./helpers/january-1990-runtime-fixture";

async function expectView(
  controller: JanuarySessionController,
  kind:
    | "idle"
    | "access-decision"
    | "learning-decision"
    | "defect-decision"
    | "committed",
) {
  expect(controller.view.kind).toBe(kind);
}

describe("January 1990 desktop session controller", () => {
  it("loads, starts and completes the persisted January month", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const controller = createJanuarySessionController({
      runtime: source.runtime,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    });

    await controller.load();
    await expectView(controller, "idle");

    await controller.start();
    await expectView(controller, "access-decision");

    await controller.choose("home-pc");
    await expectView(controller, "learning-decision");

    await controller.choose("edit-and-debug");
    await expectView(controller, "defect-decision");

    await controller.choose("inspect-listing");
    await expectView(controller, "committed");
    expect(source.harness.getSave().revision).toBe(1);
    expect(source.harness.getStats().commitMutations).toBe(1);
  });

  it("reuses deterministic request IDs for retryable operations", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const controller = createJanuarySessionController({
      runtime: source.runtime,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    });
    source.harness.loseNextAcknowledgement("beginMonthRun");

    await controller.load();
    await controller.start();
    expect(controller.view).toMatchObject({
      kind: "rejected",
      retryable: true,
    });

    await controller.retry();
    expect(controller.view.kind).toBe("access-decision");
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });
  });
});
