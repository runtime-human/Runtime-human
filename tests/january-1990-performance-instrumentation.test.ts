import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createPerformanceRecorder,
  type PerformanceSampleV1,
  type PerformanceTimingName,
} from "../apps/desktop/src/performance/performance-recorder";
import { createDesktopJanuarySession } from "../apps/desktop/src/january/create-desktop-january-session";
import type { JanuaryContentFetchPort } from "../apps/desktop/src/january/load-january-content";
import { createHarnessedJanuaryRuntime } from "./helpers/january-1990-runtime-fixture";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

const fetchPublishedContent: JanuaryContentFetchPort = async (url) => {
  const relative = url.replace(/^\/content\//u, "");
  try {
    const body = await readFile(join(CONTENT_ROOT, ...relative.split("/")), "utf8");
    return { ok: true, status: 200, text: async () => body };
  } catch {
    return { ok: false, status: 404, text: async () => "" };
  }
};

describe("January 1990 performance instrumentation", () => {
  it("observes a complete playable month without changing its durable result", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const samples: PerformanceSampleV1[] = [];
    let clock = 0;
    const performance = createPerformanceRecorder({
      nowMilliseconds: () => {
        clock += 0.25;
        return clock;
      },
      onSample: (sample) => samples.push(sample),
    });

    const session = await createDesktopJanuarySession({
      persistence: source.harness.service,
      fetchContent: fetchPublishedContent,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
      performance,
    });
    await session.start();
    await session.choose("home-pc");
    await session.choose("edit-and-debug");
    await session.choose("inspect-listing");

    expect(session.view).toMatchObject({ kind: "committed", saveRevision: 1 });
    expect(sampleCounts(samples)).toEqual({
      "app.session_bootstrap": 1,
      "content.load_chunk": 2,
      "content.load_manifest": 1,
      "content.publish_registry": 1,
      "month.begin": 1,
      "month.bootstrap_save": 1,
      "month.commit": 1,
      "month.load": 1,
      "month.resume": 2,
      "month.retry": 0,
    });
    expect(samples.every((sample) => sample.durationMicroseconds > 0)).toBe(true);
  });
});

function sampleCounts(samples: readonly PerformanceSampleV1[]): Record<PerformanceTimingName, number> {
  const counts: Record<PerformanceTimingName, number> = {
    "app.session_bootstrap": 0,
    "content.load_chunk": 0,
    "content.load_manifest": 0,
    "content.publish_registry": 0,
    "month.begin": 0,
    "month.bootstrap_save": 0,
    "month.commit": 0,
    "month.load": 0,
    "month.resume": 0,
    "month.retry": 0,
  };
  for (const sample of samples) counts[sample.name] += 1;
  return counts;
}
