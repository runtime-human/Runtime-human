import { describe, expect, it } from "vitest";

import {
  createDesktopEvidenceReport,
  nearestRank,
  parseDesktopEvidenceCapture,
} from "../scripts/performance/desktop-evidence-contract.mjs";

const COMMIT = "6472f5c3fac508cdc4cf2827aec34dcd15d8916d";
const HOST = {
  os: "windows",
  arch: "x64",
  logicalProcessors: 8,
  memoryMiB: 16_384,
  cpuModel: "Test CPU",
} as const;

function capture(sampleIndex: number, overrides: Readonly<Record<string, unknown>> = {}): unknown {
  return {
    schemaVersion: "runtime-human-desktop-performance-capture-v1",
    commit: COMMIT,
    host: HOST,
    scenario: "startup-shell-fmp",
    classification: {
      process: "cold-process",
      osCache: "warm-os-cache",
      database: "existing-clean-database",
      sampleRole: "measurement",
    },
    sampleIndex,
    externalDurationsMicros: {
      processToShellFmpMicros: 25_000 + sampleIndex,
      processToMainWindowObservedMicros: 10_000 + sampleIndex,
    },
    rustSnapshot: {
      schemaVersion: "runtime-human-desktop-performance-snapshot-v1",
      events: [
        rustMark("processEntry", 0),
        rustMark("tauriSetupStart", 100),
        rustMark("persistenceWorkerReady", 4_000 + sampleIndex),
        rustMark("tauriSetupComplete", 5_000 + sampleIndex),
        rustMark("mainWindowAvailable", 8_000 + sampleIndex),
        rustDuration("tauriCommandDispatch", "query", 1_000 + sampleIndex, 800),
        rustDuration("persistenceQueueWait", "query", 1_100 + sampleIndex, 50),
        rustDuration("persistenceDatabaseOperation", "query", 1_200 + sampleIndex, 300),
      ],
      droppedEvents: 0,
    },
    browserEntries: [
      browserMark("app.renderer_bootstrap", 0),
      browserMark("app.react_shell_commit", 1_000 + sampleIndex),
      browserMark("app.january_session_ready", 5_000 + sampleIndex),
      browserMark("app.first_meaningful_paint", 6_000 + sampleIndex),
      browserMeasure("app.session_bootstrap", 0, 5_000 + sampleIndex),
    ],
    ...overrides,
  };
}

function rustMark(name: string, atMicros: number) {
  return {
    name,
    atMicros,
    durationMicros: null,
    category: null,
    operationId: null,
    queueDepth: null,
  };
}

function rustDuration(
  name: string,
  category: string,
  atMicros: number,
  durationMicros: number,
  operationId = 1,
) {
  return {
    name,
    atMicros,
    durationMicros,
    category,
    operationId,
    queueDepth: name === "persistenceQueueWait" ? 1 : null,
  };
}

function browserMark(name: string, startMicros: number) {
  return { name, entryType: "mark", startMicros, durationMicros: 0 };
}

function browserMeasure(name: string, startMicros: number, durationMicros: number) {
  return { name, entryType: "measure", startMicros, durationMicros };
}

type MetricSummary = Readonly<{
  name: string;
  unit: "microseconds";
  count: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  budget: Readonly<{
    status: "within-target" | "warning" | "unbudgeted";
    p50MaximumMicros: number | null;
    p95MaximumMicros: number | null;
    p99MaximumMicros: number | null;
  }>;
}>;

function metric(report: ReturnType<typeof createDesktopEvidenceReport>, name: string): MetricSummary {
  const group = report.groups[0] as { metrics: readonly MetricSummary[] } | undefined;
  const found = group?.metrics.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`Missing metric ${name}`);
  return found;
}

describe("desktop performance evidence", () => {
  it("validates and freezes the closed capture contract", () => {
    const parsed = parseDesktopEvidenceCapture(capture(0));

    expect(parsed.schemaVersion).toBe("runtime-human-desktop-performance-capture-v1");
    expect(parsed.scenario).toBe("startup-shell-fmp");
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.rustSnapshot.events)).toBe(true);
  });

  it("rejects unknown fields, unsafe values and unsupported names", () => {
    expect(() =>
      parseDesktopEvidenceCapture({ ...(capture(0) as object), secretPayload: "no" }),
    ).toThrow(/exactly/u);

    expect(() =>
      parseDesktopEvidenceCapture(capture(0, { sampleIndex: Number.MAX_SAFE_INTEGER + 1 })),
    ).toThrow(/safe integer/u);

    expect(() =>
      parseDesktopEvidenceCapture(capture(0, { scenario: "arbitrary-benchmark" })),
    ).toThrow(/unsupported/u);
  });

  it("rejects Rust and browser entries with the wrong semantic shape", () => {
    const invalidStartupSpan = capture(0, {
      rustSnapshot: {
        schemaVersion: "runtime-human-desktop-performance-snapshot-v1",
        events: [{ ...rustMark("processEntry", 0), durationMicros: 1 }],
        droppedEvents: 0,
      },
    });
    expect(() => parseDesktopEvidenceCapture(invalidStartupSpan)).toThrow(/startup mark/u);

    const invalidQueueMark = capture(0, {
      rustSnapshot: {
        schemaVersion: "runtime-human-desktop-performance-snapshot-v1",
        events: [rustMark("persistenceQueueWait", 0)],
        droppedEvents: 0,
      },
    });
    expect(() => parseDesktopEvidenceCapture(invalidQueueMark)).toThrow(/operation span/u);

    const invalidRendererMeasure = capture(0, {
      browserEntries: [browserMeasure("app.renderer_bootstrap", 0, 1)],
    });
    expect(() => parseDesktopEvidenceCapture(invalidRendererMeasure)).toThrow(/browser mark/u);

    const invalidMonthMark = capture(0, {
      browserEntries: [browserMark("month.load", 0)],
    });
    expect(() => parseDesktopEvidenceCapture(invalidMonthMark)).toThrow(/browser measure/u);
  });

  it("uses nearest-rank percentiles", () => {
    expect(nearestRank([40, 10, 30, 20], 0.5)).toBe(20);
    expect(nearestRank([40, 10, 30, 20], 0.95)).toBe(40);
    expect(nearestRank([1], 0.99)).toBe(1);
  });

  it("groups comparable measurement samples and preserves raw captures", () => {
    const report = createDesktopEvidenceReport([capture(2), capture(0), capture(1)]);

    expect(report.schemaVersion).toBe("runtime-human-desktop-performance-evidence-v1");
    expect(report.captureCount).toBe(3);
    expect(report.measurementCount).toBe(3);
    expect(report.groups).toHaveLength(1);
    expect(report.captures.map((item) => item.sampleIndex)).toEqual([0, 1, 2]);

    const group = report.groups[0] as {
      sampleCount: number;
      missingMetrics: readonly unknown[];
    };
    expect(group.sampleCount).toBe(3);
    expect(group.missingMetrics).toEqual([]);
    expect(metric(report, "browser.renderer_to_first_meaningful_paint")).toEqual({
      name: "browser.renderer_to_first_meaningful_paint",
      unit: "microseconds",
      count: 3,
      min: 6_000,
      p50: 6_001,
      p95: 6_002,
      p99: 6_002,
      max: 6_002,
      budget: {
        status: "unbudgeted",
        p50MaximumMicros: null,
        p95MaximumMicros: null,
        p99MaximumMicros: null,
      },
    });
  });

  it("preserves every repeated Rust operation span inside one capture", () => {
    const base = capture(0) as {
      rustSnapshot: { schemaVersion: string; events: unknown[]; droppedEvents: number };
    };
    const report = createDesktopEvidenceReport([
      {
        ...base,
        rustSnapshot: {
          ...base.rustSnapshot,
          events: [
            ...base.rustSnapshot.events,
            rustDuration("persistenceQueueWait", "query", 1_300, 70, 2),
            rustDuration("persistenceDatabaseOperation", "query", 1_400, 500, 2),
          ],
        },
      },
    ]);

    expect(metric(report, "rust.queue_wait.query")).toEqual({
      name: "rust.queue_wait.query",
      unit: "microseconds",
      count: 2,
      min: 50,
      p50: 50,
      p95: 70,
      p99: 70,
      max: 70,
      budget: {
        status: "within-target",
        p50MaximumMicros: null,
        p95MaximumMicros: 5_000,
        p99MaximumMicros: 25_000,
      },
    });
    expect(metric(report, "rust.database_operation.query").count).toBe(2);
  });

  it("classifies startup targets as warning-only without rejecting the report", () => {
    const report = createDesktopEvidenceReport([
      capture(0, {
        externalDurationsMicros: {
          processToShellFmpMicros: 3_000_000,
          processToMainWindowObservedMicros: 10_000,
        },
      }),
    ]);

    expect(metric(report, "external.processToShellFmpMicros").budget).toEqual({
      status: "warning",
      p50MaximumMicros: 1_200_000,
      p95MaximumMicros: 2_500_000,
      p99MaximumMicros: null,
    });
    expect(report.measurementCount).toBe(1);
  });

  it("rejects duplicate capture identities that would bias percentiles", () => {
    expect(() => createDesktopEvidenceReport([capture(0), capture(0)])).toThrow(
      /duplicate capture identity/u,
    );
  });

  it("does not mix commits or host profiles", () => {
    expect(() =>
      createDesktopEvidenceReport([
        capture(0),
        capture(1, { commit: "08d35ff2a63755359f85b21d3e03029dfb1bb58b" }),
      ]),
    ).toThrow(/different commit or host/u);

    expect(() =>
      createDesktopEvidenceReport([
        capture(0),
        capture(1, { host: { ...HOST, logicalProcessors: 12 } }),
      ]),
    ).toThrow(/different commit or host/u);
  });

  it("reports dropped Rust events and missing required metrics as warnings", () => {
    const broken = capture(0, {
      rustSnapshot: {
        schemaVersion: "runtime-human-desktop-performance-snapshot-v1",
        events: [rustMark("processEntry", 0)],
        droppedEvents: 2,
      },
      browserEntries: [browserMark("app.renderer_bootstrap", 0)],
      externalDurationsMicros: {},
    });

    const report = createDesktopEvidenceReport([broken]);
    const group = report.groups[0] as {
      droppedRustEvents: number;
      warnings: readonly string[];
      missingMetrics: readonly Readonly<{ name: string; count: number }>[];
    };
    expect(group.droppedRustEvents).toBe(2);
    expect(group.warnings).toEqual(["sample 0 dropped 2 Rust event(s)"]);
    expect(group.missingMetrics.map((entry) => entry.name)).toEqual([
      "browser.renderer_to_first_meaningful_paint",
      "browser.renderer_to_shell_commit",
      "external.processToShellFmpMicros",
      "rust.process_to_main_window",
      "rust.process_to_persistence_ready",
      "rust.tauri_setup",
    ]);
  });
});
