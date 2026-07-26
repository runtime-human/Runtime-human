export type PerformanceMeasureName =
  | "app.session_bootstrap"
  | "content.manifest"
  | "content.chunk"
  | "content.registry"
  | "month.load"
  | "month.begin"
  | "month.resume"
  | "month.commit"
  | "month.retry";

export type PerformanceRecorder = Readonly<{
  measure<T>(name: PerformanceMeasureName, operation: () => Promise<T>): Promise<T>;
}>;

export type UserTimingPort = Readonly<{
  mark(name: string): void;
  measure(name: string, options: Readonly<{ start: string }>): void;
  clearMarks(name: string): void;
}>;

export const NOOP_PERFORMANCE_RECORDER: PerformanceRecorder = Object.freeze({
  measure<T>(_name: PerformanceMeasureName, operation: () => Promise<T>): Promise<T> {
    return operation();
  },
});

export function createBrowserPerformanceRecorder(
  port: UserTimingPort = globalThis.performance,
): PerformanceRecorder {
  let sequence = 0;
  return Object.freeze({
    async measure<T>(name: PerformanceMeasureName, operation: () => Promise<T>): Promise<T> {
      sequence += 1;
      const startMark = `runtime-human:${name}:${sequence}:start`;
      safely(() => port.mark(startMark));
      try {
        return await operation();
      } finally {
        safely(() => port.measure(name, { start: startMark }));
        safely(() => port.clearMarks(startMark));
      }
    },
  });
}

function safely(operation: () => void): void {
  try {
    operation();
  } catch {
    // Performance telemetry is strictly observational and must never alter gameplay.
  }
}
