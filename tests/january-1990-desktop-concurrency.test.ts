import { describe, expect, it } from "vitest";

import type { January1990Runtime } from "@runtime-human/game-application";

import { createJanuarySessionController } from "../apps/desktop/src/january/january-session-controller";
import { createHarnessedJanuaryRuntime } from "./helpers/january-1990-runtime-fixture";

function deferred(): Readonly<{ promise: Promise<void>; resolve(): void }> {
  let resolvePromise: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve() {
      if (resolvePromise === null) throw new Error("Deferred promise was not initialized");
      resolvePromise();
    },
  };
}

describe("January 1990 desktop action concurrency", () => {
  it("collapses identical concurrent start actions into one runtime call", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const gate = deferred();
    let beginCalls = 0;
    const runtime: January1990Runtime = {
      ...source.runtime,
      async begin(input) {
        beginCalls += 1;
        await gate.promise;
        return source.runtime.begin(input);
      },
    };
    const controller = createJanuarySessionController({
      runtime,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    });
    await controller.load();

    const first = controller.start();
    const second = controller.start();

    expect(second).toBe(first);
    expect(beginCalls).toBe(1);
    gate.resolve();
    await expect(first).resolves.toMatchObject({ kind: "access-decision" });
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });
  });

  it("collapses identical concurrent decision actions into one runtime call", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const gate = deferred();
    let resumeCalls = 0;
    const runtime: January1990Runtime = {
      ...source.runtime,
      async resume(input) {
        resumeCalls += 1;
        await gate.promise;
        return source.runtime.resume(input);
      },
    };
    const controller = createJanuarySessionController({
      runtime,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    });
    await controller.load();
    await controller.start();

    const first = controller.choose("home-pc");
    const second = controller.choose("home-pc");

    expect(second).toBe(first);
    expect(resumeCalls).toBe(1);
    gate.resolve();
    await expect(first).resolves.toMatchObject({ kind: "learning-decision" });
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 2,
      commitMutations: 0,
    });
  });
});
