import { describe, expect, it } from "vitest";

import { createDesktopEvidenceReport } from "../scripts/performance/desktop-evidence-contract.mjs";

const COMMIT = "b".repeat(40);
const BOOTSTRAP_SPANS = [
  ["persistenceBootstrapPath", "rust.bootstrap.path"],
  ["persistenceBootstrapSqliteVersion", "rust.bootstrap.sqlite_version"],
  ["persistenceBootstrapConnectionOpen", "rust.bootstrap.connection_open"],
  ["persistenceBootstrapSchemaCheck", "rust.bootstrap.schema_check"],
  ["persistenceBootstrapConnectionConfigure", "rust.bootstrap.connection_configure"],
  ["persistenceBootstrapMigration", "rust.bootstrap.migration"],
  ["persistenceBootstrapManifestVerify", "rust.bootstrap.manifest_verify"],
  ["persistenceBootstrapIntegrityVerify", "rust.bootstrap.integrity_verify"],
  ["persistenceBootstrapCleanMarker", "rust.bootstrap.clean_marker"],
] as const;

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

function bootstrapSpan(name: string, atMicros: number, durationMicros: number) {
  return {
    name,
    atMicros,
    durationMicros,
    category: null,
    operationId: null,
    queueDepth: null,
  };
}

function capture() {
  return {
    schemaVersion: "runtime-human-desktop-performance-capture-v1",
    commit: COMMIT,
    host: {
      os: "windows",
      arch: "x64",
      logicalProcessors: 8,
      memoryMiB: 16_384,
      cpuModel: "Bootstrap Test CPU",
    },
    scenario: "startup-shell-fmp",
    classification: {
      process: "cold-process",
      osCache: "warm-os-cache",
      database: "new-database",
      sampleRole: "measurement",
    },
    sampleIndex: 0,
    externalDurationsMicros: {},
    rustSnapshot: {
      schemaVersion: "runtime-human-desktop-performance-snapshot-v1",
      events: [
        rustMark("processEntry", 0),
        rustMark("tauriSetupStart", 100),
        ...BOOTSTRAP_SPANS.map(([name], index) => bootstrapSpan(name, 200 + index * 100, 10 + index)),
        rustMark("persistenceWorkerReady", 2_000),
        rustMark("tauriSetupComplete", 2_100),
        rustMark("mainWindowAvailable", 2_500),
      ],
      droppedEvents: 0,
    },
    browserEntries: [
      {
        name: "app.renderer_bootstrap",
        entryType: "mark",
        startMicros: 0,
        durationMicros: 0,
      },
      {
        name: "app.react_shell_commit",
        entryType: "mark",
        startMicros: 1_000,
        durationMicros: 0,
      },
      {
        name: "app.january_session_ready",
        entryType: "mark",
        startMicros: 1_200,
        durationMicros: 0,
      },
      {
        name: "app.first_meaningful_paint",
        entryType: "mark",
        startMicros: 1_300,
        durationMicros: 0,
      },
    ],
  };
}

describe("desktop bootstrap evidence", () => {
  it("accepts closed bootstrap spans and exposes category-free metrics", () => {
    const report = createDesktopEvidenceReport([capture()]);
    const group = report.groups[0];

    expect(group).toBeDefined();
    const metricNames = group?.metrics.map((metric) => metric.name) ?? [];
    for (const [, metricName] of BOOTSTRAP_SPANS) {
      expect(metricNames).toContain(metricName);
      expect(metricNames).not.toContain(`${metricName}.null`);
    }
  });

  it("treats bootstrap spans as required startup evidence", () => {
    const withoutBootstrap = capture();
    withoutBootstrap.rustSnapshot.events = withoutBootstrap.rustSnapshot.events.filter(
      (event) => !event.name.startsWith("persistenceBootstrap"),
    );

    const report = createDesktopEvidenceReport([withoutBootstrap]);
    const missingNames = report.groups[0]?.missingMetrics.map((entry) => entry.name) ?? [];

    for (const [, metricName] of BOOTSTRAP_SPANS) {
      expect(missingNames).toContain(metricName);
    }
  });
});
