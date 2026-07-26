import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { PerformanceRecorder } from "../apps/desktop/src/performance/performance-recorder";
import { createDesktopJanuarySession } from "../apps/desktop/src/january/create-desktop-january-session";
import {
  createJanuarySessionController,
  type JanuarySessionView,
} from "../apps/desktop/src/january/january-session-controller";
import type { JanuaryContentFetchPort } from "../apps/desktop/src/january/load-january-content";
import { createHarnessedJanuaryRuntime } from "./helpers/january-1990-runtime-fixture";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

function createRecorder(measures: string[]): PerformanceRecorder {
  return {
    async measure(name, operation) {
      measures.push(name);
      return operation();
    },
  };
}

const fetchPublishedContent: JanuaryContentFetchPort = async (url) => {
  const relative = url.replace(/^\/content\//u, "");
  try {
    const body = await readFile(join(CONTENT_ROOT, ...relative.split("/")), "utf8");
    return { ok: true, status: 200, text: async () => body };
  } catch {
    return { ok: false, status: 404, text: async () => "" };
  }
};

async function expectKind(view: Promise<JanuarySessionView>, kind: JanuarySessionView["kind"]) {
  expect((await view).kind).toBe(kind);
}

describe("January desktop performance instrumentation", () => {
  it("records bootstrap, manifest, chunks, registry and initial month load", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const measures: string[] = [];

    await createDesktopJanuarySession({
      persistence: source.harness.service,
      fetchContent: fetchPublishedContent,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
      performance: createRecorder(measures),
    });

    expect(measures[0]).toBe("app.session_bootstrap");
    expect(measures).toContain("content.manifest");
    expect(measures.filter((name) => name === "content.chunk")).toHaveLength(2);
    expect(measures).toContain("content.registry");
    expect(measures).toContain("month.load");
  });

  it("records begin, resume, commit and retry without changing gameplay", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const measures: string[] = [];
    const controller = createJanuarySessionController({
      runtime: source.runtime,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
      performance: createRecorder(measures),
    });

    await expectKind(controller.load(), "idle");
    await expectKind(controller.start(), "access-decision");
    await expectKind(controller.choose("home-pc"), "learning-decision");
    await expectKind(controller.choose("edit-and-debug"), "defect-decision");
    await expectKind(controller.choose("inspect-listing"), "committed");

    expect(measures).toEqual([
      "month.load",
      "month.begin",
      "month.resume",
      "month.resume",
      "month.commit",
    ]);
    expect(source.harness.getSave().revision).toBe(1);

    const retrySource = await createHarnessedJanuaryRuntime();
    const retryMeasures: string[] = [];
    const retryController = createJanuarySessionController({
      runtime: retrySource.runtime,
      saveId: retrySource.saveId,
      runId: retrySource.runId,
      seed: 42n,
      performance: createRecorder(retryMeasures),
    });
    retrySource.harness.loseNextAcknowledgement("beginMonthRun");

    await retryController.load();
    await retryController.start();
    await expectKind(retryController.retry(), "access-decision");

    expect(retryMeasures).toEqual(["month.load", "month.begin", "month.retry"]);
    expect(retrySource.harness.getStats().beginMutations).toBe(1);
  });

  it("coalesces concurrent starts into one timing measure", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const measures: string[] = [];
    const controller = createJanuarySessionController({
      runtime: source.runtime,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
      performance: createRecorder(measures),
    });
    await controller.load();

    const first = controller.start();
    const second = controller.start();
    await Promise.all([first, second]);

    expect(measures.filter((name) => name === "month.begin")).toHaveLength(1);
    expect(source.harness.getStats().beginMutations).toBe(1);
  });
});
