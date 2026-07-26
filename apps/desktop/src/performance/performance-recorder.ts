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

export function createPerformanceRecorder(
  input: CreatePerformanceRecorderInput,
): PerformanceRecorder {
  const nowMilliseconds = input.nowMilliseconds ?? (() => globalThis.performance.now());

  return Object.freeze({
    async measure<T>(name: PerformanceTimingName, operation: () => Promise<T>): Promise<T> {
      const startedAt = nowMilliseconds();
      try {
        const value = await operation();
        publish(name, "fulfilled", startedAt, nowMilliseconds());
        return value;
      } catch (error) {
        const finishedAt = nowMilliseconds();
        if (finishedAt >= startedAt) publish(name, "rejected", startedAt, finishedAt);
        throw error;
      }
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

export const NOOP_PERFORMANCE_RECORDER: PerformanceRecorder = Object.freeze({
  measure<T>(_name: PerformanceTimingName, operation: () => Promise<T>): Promise<T> {
    return operation();
  },
});
