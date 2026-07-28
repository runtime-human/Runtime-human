export type DesktopEvidenceScenario =
  | "startup-shell-fmp"
  | "startup-january-ready"
  | "load-persisted-context"
  | "begin-month-run"
  | "resume-month-run"
  | "final-commit";

export type DesktopEvidenceClassification = Readonly<{
  process: "cold-process" | "warm-process";
  osCache: "cold-os-cache" | "warm-os-cache";
  database: "new-database" | "existing-clean-database";
  sampleRole: "warmup" | "measurement";
}>;

export type DesktopEvidenceHost = Readonly<{
  os: "windows";
  arch: "x64" | "arm64";
  logicalProcessors: number;
  memoryMiB: number;
  cpuModel: string;
}>;

export type DesktopRustCategory =
  | "query"
  | "mutation"
  | "backup"
  | "recovery"
  | "shutdown";

export type DesktopRustMarkEvent = Readonly<{
  name:
    | "processEntry"
    | "tauriSetupStart"
    | "persistenceWorkerReady"
    | "tauriSetupComplete"
    | "mainWindowAvailable";
  atMicros: number;
  durationMicros: null;
  category: null;
  operationId: null;
  queueDepth: null;
}>;

export type DesktopRustOperationEvent = Readonly<{
  name: "tauriCommandDispatch" | "persistenceDatabaseOperation";
  atMicros: number;
  durationMicros: number;
  category: DesktopRustCategory;
  operationId: number;
  queueDepth: null;
}>;

export type DesktopRustQueueWaitEvent = Readonly<{
  name: "persistenceQueueWait";
  atMicros: number;
  durationMicros: number;
  category: DesktopRustCategory;
  operationId: number;
  queueDepth: number;
}>;

export type DesktopRustEvent =
  | DesktopRustMarkEvent
  | DesktopRustOperationEvent
  | DesktopRustQueueWaitEvent;

export type DesktopBrowserMark = Readonly<{
  name:
    | "app.renderer_bootstrap"
    | "app.react_shell_commit"
    | "app.january_session_ready"
    | "app.first_meaningful_paint";
  entryType: "mark";
  startMicros: number;
  durationMicros: 0;
}>;

export type DesktopBrowserMeasure = Readonly<{
  name:
    | "app.session_bootstrap"
    | "content.manifest"
    | "content.chunk"
    | "content.registry"
    | "month.load"
    | "month.begin"
    | "month.resume"
    | "month.commit"
    | "month.retry";
  entryType: "measure";
  startMicros: number;
  durationMicros: number;
}>;

export type DesktopEvidenceCapture = Readonly<{
  schemaVersion: "runtime-human-desktop-performance-capture-v1";
  commit: string;
  host: DesktopEvidenceHost;
  scenario: DesktopEvidenceScenario;
  classification: DesktopEvidenceClassification;
  sampleIndex: number;
  externalDurationsMicros: Readonly<
    Partial<
      Record<
        | "processToShellFmpMicros"
        | "processToJanuaryReadyMicros"
        | "processToMainWindowObservedMicros",
        number
      >
    >
  >;
  rustSnapshot: Readonly<{
    schemaVersion: "runtime-human-desktop-performance-snapshot-v1";
    events: readonly DesktopRustEvent[];
    droppedEvents: number;
  }>;
  browserEntries: readonly (DesktopBrowserMark | DesktopBrowserMeasure)[];
}>;

export type DesktopMetricBudget = Readonly<{
  status: "within-target" | "warning" | "unbudgeted";
  p50MaximumMicros: number | null;
  p95MaximumMicros: number | null;
  p99MaximumMicros: number | null;
}>;

export type DesktopMetricSummary = Readonly<{
  name: string;
  unit: "microseconds";
  count: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  budget: DesktopMetricBudget;
}>;

export type DesktopEvidenceGroup = Readonly<{
  scenario: DesktopEvidenceScenario;
  classification: DesktopEvidenceClassification;
  sampleCount: number;
  droppedRustEvents: number;
  missingMetrics: readonly Readonly<{ name: string; count: number }>[];
  metrics: readonly DesktopMetricSummary[];
  warnings: readonly string[];
}>;

export type DesktopEvidenceReport = Readonly<{
  schemaVersion: "runtime-human-desktop-performance-evidence-v1";
  commit: string;
  host: DesktopEvidenceHost;
  captureCount: number;
  warmupCount: number;
  measurementCount: number;
  groups: readonly DesktopEvidenceGroup[];
  captures: readonly DesktopEvidenceCapture[];
}>;

export function parseDesktopEvidenceCapture(value: unknown, label?: string): DesktopEvidenceCapture;

export function createDesktopEvidenceReport(captures: readonly unknown[]): DesktopEvidenceReport;

export function nearestRank(values: readonly number[], percentile: number): number;

export const DESKTOP_EVIDENCE_SCHEMAS: Readonly<{
  capture: "runtime-human-desktop-performance-capture-v1";
  report: "runtime-human-desktop-performance-evidence-v1";
}>;
