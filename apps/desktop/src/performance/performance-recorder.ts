export type PerformanceTimingName =
  | "app.session_bootstrap"
  | "content.load_manifest"
  | "content.load_chunk"
  | "content.publish_registry"
  | "month.bootstrap_save"
  | "month.load"
  | "month.begin"
  | "month.resume"
  | "month.commit"
  | "month.retry";

export type PerformanceSampleV1 = Readonly<{
  schemaVersion: "performance-sample-v1";
  name: PerformanceTimingName;
  durationMicroseconds: number;
  status: "fulfilled" | "rejected";
}>;

export type PerformanceRecorder = Readonly<{
  measure<T>(name: PerformanceTimingName, operation: () => Promise<T>): Promise<T>;
}>;

export type CreatePerformanceRecorderInput = Readonly<{
  nowMilliseconds?: () => number;
  onSample: (sample: PerformanceSampleV1) => void;
}>;

export type UserTimingPerformancePort = Readonly<{
  mark(name: string): void;
  measure(name: string, startMark: string, endMark: string): void;
  clearMarks(name?: string): void;
}>;

export function createPerformanceRecorder(
  input: CreatePerformanceRecorderInput,
): PerformanceRecorder {
  const nowMilliseconds = input.nowMilliseconds ?? (() => globalThis.performance.now());

  return Object.freeze({
    async measure<T>(name: PerformanceTimingName, operation: () => Promise<T>): Promise<T> {
      const startedAt = nowMilliseconds();
      let outcome: Readonly<{ kind: "fulfilled"; value: T }> | Readonly<{
        kind: "rejected";
        error: unknown;
      }>;
      try {
        outcome = Object.freeze({ kind: "fulfilled", value: await operation() });
      } catch (error) {
        outcome = Object.freeze({ kind: "rejected", error });
      }
      const finishedAt = nowMilliseconds();
      publish(name, outcome.kind, startedAt, finishedAt);
      if (outcome.kind === "rejected") throw outcome.error;
      return outcome.value;
    },
  });

  function publish(
    name: PerformanceTimingName,
    status: PerformanceSampleV1["status"],
    startedAt: number,
    finishedAt: number,
  ): void {
    if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) {
      throw new TypeError("Performance clock must return finite milliseconds");
    }
    if (finishedAt < startedAt) throw new RangeError("Performance clock moved backwards");
    input.onSample(
      Object.freeze({
        schemaVersion: "performance-sample-v1",
        name,
        durationMicroseconds: Math.round((finishedAt - startedAt) * 1000),
        status,
      }),
    );
  }
}

export function createUserTimingPerformanceRecorder(
  userTiming: UserTimingPerformancePort = globalThis.performance,
): PerformanceRecorder {
  let sequence = 0;
  return Object.freeze({
    async measure<T>(name: PerformanceTimingName, operation: () => Promise<T>): Promise<T> {
      const measurementId = sequence;
      sequence += 1;
      const prefix = `runtime-human:${name}:${measurementId}`;
      const startMark = `${prefix}:start`;
      const endMark = `${prefix}:end`;
      safeUserTiming(() => userTiming.mark(startMark));
      try {
        const value = await operation();
        publishUserTiming("fulfilled");
        return value;
      } catch (error) {
        publishUserTiming("rejected");
        throw error;
      } finally {
        safeUserTiming(() => userTiming.clearMarks(startMark));
        safeUserTiming(() => userTiming.clearMarks(endMark));
      }

      function publishUserTiming(status: PerformanceSampleV1["status"]): void {
        safeUserTiming(() => userTiming.mark(endMark));
        safeUserTiming(() =>
          userTiming.measure(`runtime-human:${name}:${status}`, startMark, endMark),
        );
      }
    },
  });
}

function safeUserTiming(operation: () => void): void {
  try {
    operation();
  } catch {
    // Observational browser timings must never alter authoritative behavior.
  }
}

export const NOOP_PERFORMANCE_RECORDER: PerformanceRecorder = Object.freeze({
  measure<T>(_name: PerformanceTimingName, operation: () => Promise<T>): Promise<T> {
    return operation();
  },
});
