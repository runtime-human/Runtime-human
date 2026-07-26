import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createPerformanceRecorder,
  type PerformanceSampleV1,
  type PerformanceTimingName,
} from "../../apps/desktop/src/performance/performance-recorder";
import { createDesktopJanuarySession } from "../../apps/desktop/src/january/create-desktop-january-session";
import type { JanuaryContentFetchPort } from "../../apps/desktop/src/january/load-january-content";
import { createHarnessedJanuaryRuntime } from "./january-1990-runtime-fixture";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

const BASELINE_TIMING_NAMES = Object.freeze([
  "app.session_bootstrap",
  "content.load_manifest",
  "content.load_chunk",
  "content.publish_registry",
  "month.bootstrap_save",
  "month.load",
  "month.begin",
  "month.resume",
  "month.commit",
] as const satisfies readonly PerformanceTimingName[]);

export type PerformanceTimingSummaryV1 = Readonly<{
  name: (typeof BASELINE_TIMING_NAMES)[number];
  count: number;
  minMicroseconds: number;
  p50Microseconds: number;
  p95Microseconds: number;
  p99Microseconds: number;
  maxMicroseconds: number;
}>;

export type January1990PerformanceBaselineV1 = Readonly<{
  schemaVersion: "january-1990-performance-baseline-v1";
  scenario: Readonly<{
    content: "published-compiled-content";
    persistence: "in-memory-persistence-harness";
    seed: 42;
    choices: readonly ["home-pc", "edit-and-debug", "inspect-listing"];
    warmupRuns: number;
    measuredRuns: number;
  }>;
  timings: readonly PerformanceTimingSummaryV1[];
}>;

export async function runJanuary1990PerformanceBaseline(
  input: Readonly<{ warmupRuns: number; measuredRuns: number }>,
): Promise<January1990PerformanceBaselineV1> {
  validateRunCount(input.warmupRuns, "warmupRuns", true);
  validateRunCount(input.measuredRuns, "measuredRuns", false);

  for (let index = 0; index < input.warmupRuns; index += 1) await runMeasuredMonth(false);

  const samples: PerformanceSampleV1[] = [];
  for (let index = 0; index < input.measuredRuns; index += 1) {
    samples.push(...(await runMeasuredMonth(true)));
  }

  const timings = BASELINE_TIMING_NAMES.map((name) => summarize(name, samples));
  return Object.freeze({
    schemaVersion: "january-1990-performance-baseline-v1",
    scenario: Object.freeze({
      content: "published-compiled-content",
      persistence: "in-memory-persistence-harness",
      seed: 42,
      choices: Object.freeze(["home-pc", "edit-and-debug", "inspect-listing"] as const),
      warmupRuns: input.warmupRuns,
      measuredRuns: input.measuredRuns,
    }),
    timings: Object.freeze(timings),
  });
}

async function runMeasuredMonth(collectSamples: boolean): Promise<readonly PerformanceSampleV1[]> {
  const source = await createHarnessedJanuaryRuntime();
  const samples: PerformanceSampleV1[] = [];
  const performance = createPerformanceRecorder({
    onSample: (sample) => {
      if (collectSamples) samples.push(sample);
    },
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
  if (session.view.kind !== "committed") {
    throw new Error(`January performance scenario ended as ${session.view.kind}`);
  }
  if (samples.some((sample) => sample.status !== "fulfilled")) {
    throw new Error("January performance scenario recorded a rejected operation");
  }
  return Object.freeze(samples);
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

function summarize(
  name: (typeof BASELINE_TIMING_NAMES)[number],
  samples: readonly PerformanceSampleV1[],
): PerformanceTimingSummaryV1 {
  const values = samples
    .filter((sample) => sample.name === name)
    .map((sample) => sample.durationMicroseconds)
    .toSorted((left, right) => left - right);
  if (values.length === 0) throw new Error(`January baseline has no samples for ${name}`);
  return Object.freeze({
    name,
    count: values.length,
    minMicroseconds: requireValue(values[0], name),
    p50Microseconds: percentile(values, 0.5),
    p95Microseconds: percentile(values, 0.95),
    p99Microseconds: percentile(values, 0.99),
    maxMicroseconds: requireValue(values.at(-1), name),
  });
}

function percentile(sortedValues: readonly number[], quantile: number): number {
  const index = Math.max(0, Math.ceil(sortedValues.length * quantile) - 1);
  return requireValue(sortedValues[index], `p${Math.round(quantile * 100)}`);
}

function requireValue(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Invalid January performance value for ${label}`);
  }
  return value;
}

function validateRunCount(value: number, label: string, allowZero: boolean): void {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum || value > 1_000) {
    throw new RangeError(`${label} must be an integer between ${minimum} and 1000`);
  }
}
