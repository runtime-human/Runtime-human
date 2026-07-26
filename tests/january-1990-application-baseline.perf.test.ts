import { mkdir, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { describe, expect, it } from "vitest";

import {
  classifyWarningOnlyBudget,
  summarizeDurations,
  type DurationSummary,
  type WarningOnlyBudgetResult,
} from "../scripts/performance/performance-summary";
import {
  createHarnessedJanuaryRuntime,
  loadJanuaryTestRegistry,
  requireJanuaryCommitted,
  requireJanuaryWaiting,
  resumeJanuary,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

const baselineDescribe = process.env.RUNTIME_HUMAN_PERF_BASELINE === "1" ? describe : describe.skip;
const INTERACTIVE_OPERATION_P95_BUDGET_MS = 200;

type ScenarioScope = "published-compiled-content" | "application-in-memory-persistence";

type ScenarioDefinition = Readonly<{
  id: string;
  scope: ScenarioScope;
  p95BudgetMs?: number;
  prepare: () => Promise<() => Promise<void>>;
}>;

type ScenarioResult = Readonly<{
  id: string;
  scope: ScenarioScope;
  unit: "milliseconds";
  summary: DurationSummary;
  budget: WarningOnlyBudgetResult;
}>;

baselineDescribe("January 1990 application performance baseline", () => {
  it("writes a warning-only versioned baseline artifact", async () => {
    const warmups = readIntegerEnvironment("RUNTIME_HUMAN_PERF_WARMUPS", 5, 0);
    const samples = readIntegerEnvironment("RUNTIME_HUMAN_PERF_SAMPLES", 30, 1);
    const outputPath = resolve(
      process.env.RUNTIME_HUMAN_PERF_OUTPUT ??
        "artifacts/performance/january-application-baseline.json",
    );
    const registry = await loadJanuaryTestRegistry();
    const scenarios: readonly ScenarioDefinition[] = [
      {
        id: "content.load_registry.warm_process",
        scope: "published-compiled-content",
        prepare: async () => async () => {
          await loadJanuaryTestRegistry();
        },
      },
      {
        id: "month.begin_to_access.in_memory",
        scope: "application-in-memory-persistence",
        p95BudgetMs: INTERACTIVE_OPERATION_P95_BUDGET_MS,
        prepare: async () => {
          const { runtime, saveId, runId } = await createHarnessedJanuaryRuntime({ registry });
          return async () => {
            await startJanuary(runtime, saveId, runId, "perf-begin");
          };
        },
      },
      {
        id: "month.resume_access_to_learning.in_memory",
        scope: "application-in-memory-persistence",
        p95BudgetMs: INTERACTIVE_OPERATION_P95_BUDGET_MS,
        prepare: async () => {
          const { runtime, saveId, runId } = await createHarnessedJanuaryRuntime({ registry });
          const access = await startJanuary(runtime, saveId, runId, "perf-access-setup");
          return async () => {
            requireJanuaryWaiting(
              await resumeJanuary(runtime, access, {
                requestId: "perf-resume-access",
                answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
              }),
            );
          };
        },
      },
      {
        id: "month.resume_learning_to_defect.in_memory",
        scope: "application-in-memory-persistence",
        p95BudgetMs: INTERACTIVE_OPERATION_P95_BUDGET_MS,
        prepare: async () => {
          const { runtime, saveId, runId } = await createHarnessedJanuaryRuntime({ registry });
          const access = await startJanuary(runtime, saveId, runId, "perf-learning-access-setup");
          const learning = requireJanuaryWaiting(
            await resumeJanuary(runtime, access, {
              requestId: "perf-learning-setup",
              answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
            }),
          );
          return async () => {
            requireJanuaryWaiting(
              await resumeJanuary(runtime, learning, {
                requestId: "perf-resume-learning",
                answer: {
                  schemaVersion: "january-learning-answer-v1",
                  practice: "edit-and-debug",
                },
              }),
            );
          };
        },
      },
      {
        id: "month.resume_defect_to_commit.in_memory",
        scope: "application-in-memory-persistence",
        p95BudgetMs: INTERACTIVE_OPERATION_P95_BUDGET_MS,
        prepare: async () => {
          const { runtime, saveId, runId } = await createHarnessedJanuaryRuntime({ registry });
          const access = await startJanuary(runtime, saveId, runId, "perf-defect-access-setup");
          const learning = requireJanuaryWaiting(
            await resumeJanuary(runtime, access, {
              requestId: "perf-defect-learning-setup",
              answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
            }),
          );
          const defect = requireJanuaryWaiting(
            await resumeJanuary(runtime, learning, {
              requestId: "perf-defect-setup",
              answer: {
                schemaVersion: "january-learning-answer-v1",
                practice: "edit-and-debug",
              },
            }),
          );
          return async () => {
            requireJanuaryCommitted(
              await resumeJanuary(runtime, defect, {
                requestId: "perf-resume-defect",
                answer: {
                  schemaVersion: "january-defect-answer-v1",
                  response: "inspect-listing",
                },
              }),
            );
          };
        },
      },
      {
        id: "month.full_cycle.in_memory",
        scope: "application-in-memory-persistence",
        prepare: async () => {
          const { runtime, saveId, runId } = await createHarnessedJanuaryRuntime({ registry });
          return async () => {
            const access = await startJanuary(runtime, saveId, runId, "perf-full-begin");
            const learning = requireJanuaryWaiting(
              await resumeJanuary(runtime, access, {
                requestId: "perf-full-access",
                answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
              }),
            );
            const defect = requireJanuaryWaiting(
              await resumeJanuary(runtime, learning, {
                requestId: "perf-full-learning",
                answer: {
                  schemaVersion: "january-learning-answer-v1",
                  practice: "edit-and-debug",
                },
              }),
            );
            requireJanuaryCommitted(
              await resumeJanuary(runtime, defect, {
                requestId: "perf-full-defect",
                answer: {
                  schemaVersion: "january-defect-answer-v1",
                  response: "inspect-listing",
                },
              }),
            );
          };
        },
      },
    ];

    const results: ScenarioResult[] = [];
    for (const scenario of scenarios) {
      const durations = await measurePreparedScenario(scenario.prepare, warmups, samples);
      const summary = summarizeDurations(durations);
      results.push(
        Object.freeze({
          id: scenario.id,
          scope: scenario.scope,
          unit: "milliseconds",
          summary,
          budget: classifyWarningOnlyBudget(summary, scenario.p95BudgetMs),
        }),
      );
    }

    const cpu = cpus()[0];
    const report = Object.freeze({
      schemaVersion: "runtime-human-performance-baseline-v1",
      generatedAtUtc: new Date().toISOString(),
      sourceRevision:
        process.env.RUNTIME_HUMAN_PERF_COMMIT ?? process.env.GITHUB_SHA ?? "unrecorded",
      host: Object.freeze({
        platform: platform(),
        release: release(),
        architecture: arch(),
        cpuModel: cpu?.model ?? "unknown",
        logicalCores: cpus().length,
        totalMemoryMiB: Math.round(totalmem() / 1024 / 1024),
        nodeVersion: process.version,
        runnerName: process.env.RUNNER_NAME ?? null,
        continuousIntegration: process.env.CI === "true",
      }),
      configuration: Object.freeze({
        warmups,
        samples,
        seed: 42,
        budgetEnforcement: "warning-only",
      }),
      scopeNotes: Object.freeze([
        "Published compiled-content loading measures warm-process file reads, parsing and registry publication.",
        "Month scenarios use the production January application/core path with the repository in-memory persistence harness.",
        "These numbers are not SQLite, Tauri IPC, WebView2 startup, first meaningful paint or OS cold-cache measurements.",
      ]),
      scenarios: Object.freeze(results),
      warnings: results.filter((result) => result.budget.status === "warning").length,
    });

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.table(
      results.map((result) => ({
        scenario: result.id,
        scope: result.scope,
        p50Ms: result.summary.p50Ms,
        p95Ms: result.summary.p95Ms,
        p99Ms: result.summary.p99Ms,
        targetP95Ms: result.budget.p95BudgetMs ?? "—",
        status: result.budget.status,
      })),
    );
    console.log(`[perf] wrote ${outputPath}`);
    console.log(`[perf] warning-only target exceedances: ${report.warnings}`);

    expect(report.schemaVersion).toBe("runtime-human-performance-baseline-v1");
    expect(report.scenarios).toHaveLength(6);
    expect(report.scenarios.every((scenario) => scenario.summary.sampleCount === samples)).toBe(
      true,
    );
  });
});

async function measurePreparedScenario(
  prepare: () => Promise<() => Promise<void>>,
  warmups: number,
  samples: number,
): Promise<readonly number[]> {
  for (let index = 0; index < warmups; index += 1) {
    const operation = await prepare();
    await operation();
  }

  const durations: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    const operation = await prepare();
    const startedAt = performance.now();
    await operation();
    durations.push(performance.now() - startedAt);
  }
  return Object.freeze(durations);
}

function readIntegerEnvironment(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new RangeError(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return parsed;
}
