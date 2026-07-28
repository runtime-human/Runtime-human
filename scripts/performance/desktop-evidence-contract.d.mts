export type DesktopEvidenceScenario =
  | "startup-shell-fmp"
  | "startup-january-ready"
  | "load-persisted-context"
  | "begin-month-run"
  | "resume-month-run"
  | "final-commit";

export type DesktopEvidenceCapture = Readonly<{
  schemaVersion: "runtime-human-desktop-performance-capture-v1";
  commit: string;
  host: Readonly<{
    os: "windows";
    arch: "x64" | "arm64";
    logicalProcessors: number;
    memoryMiB: number;
    cpuModel: string;
  }>;
  scenario: DesktopEvidenceScenario;
  classification: Readonly<{
    process: "cold-process" | "warm-process";
    osCache: "cold-os-cache" | "warm-os-cache";
    database: "new-database" | "existing-clean-database";
    sampleRole: "warmup" | "measurement";
  }>;
  sampleIndex: number;
  externalDurationsMicros: Readonly<Record<string, number>>;
  rustSnapshot: Readonly<{
    schemaVersion: "runtime-human-desktop-performance-snapshot-v1";
    events: readonly Readonly<Record<string, unknown>>[];
    droppedEvents: number;
  }>;
  browserEntries: readonly Readonly<{
    name: string;
    entryType: "mark" | "measure";
    startMicros: number;
    durationMicros: number;
  }>[];
}>;

export type DesktopEvidenceReport = Readonly<{
  schemaVersion: "runtime-human-desktop-performance-evidence-v1";
  commit: string;
  host: DesktopEvidenceCapture["host"];
  captureCount: number;
  warmupCount: number;
  measurementCount: number;
  groups: readonly Readonly<Record<string, unknown>>[];
  captures: readonly DesktopEvidenceCapture[];
}>;

export function parseDesktopEvidenceCapture(
  value: unknown,
  label?: string,
): DesktopEvidenceCapture;

export function createDesktopEvidenceReport(
  captures: readonly unknown[],
): DesktopEvidenceReport;

export function nearestRank(values: readonly number[], percentile: number): number;

export const DESKTOP_EVIDENCE_SCHEMAS: Readonly<{
  capture: "runtime-human-desktop-performance-capture-v1";
  report: "runtime-human-desktop-performance-evidence-v1";
}>;
