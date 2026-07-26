import { describe, expect, it } from "vitest";

import {
  createPerformanceRecorder,
  createUserTimingPerformanceRecorder,
  type PerformanceSampleV1,
} from "../apps/desktop/src/performance/performance-recorder";

describe("performance recorder", () => {
  it("records immutable integer-microsecond samples without changing the operation result", async () => {
    const times = [10, 10.125];
    const samples: PerformanceSampleV1[] = [];
    const recorder = createPerformanceRecorder({
      nowMilliseconds: () => times.shift() ?? 0,
      onSample: (sample) => samples.push(sample),
    });

    const result = await recorder.measure("month.load", async () => "loaded");

    expect(result).toBe("loaded");
    expect(samples).toEqual([
      {
        schemaVersion: "performance-sample-v1",
        name: "month.load",
        durationMicroseconds: 125,
        status: "fulfilled",
      },
    ]);
    expect(Object.isFrozen(samples[0])).toBe(true);
  });

  it("records rejected operations and rethrows the original error", async () => {
    const failure = new Error("load failed");
    const samples: PerformanceSampleV1[] = [];
    const recorder = createPerformanceRecorder({
      nowMilliseconds: sequence([20, 20.5]),
      onSample: (sample) => samples.push(sample),
    });

    await expect(
      recorder.measure("content.load_manifest", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(samples).toEqual([
      {
        schemaVersion: "performance-sample-v1",
        name: "content.load_manifest",
        durationMicroseconds: 500,
        status: "rejected",
      },
    ]);
  });

  it("rejects a clock that moves backwards after exactly two clock reads", async () => {
    const recorder = createPerformanceRecorder({
      nowMilliseconds: sequence([2, 1]),
      onSample: () => undefined,
    });

    await expect(recorder.measure("app.session_bootstrap", async () => undefined)).rejects.toThrow(
      "Performance clock moved backwards",
    );
  });

  it("publishes fulfilled operations through local browser User Timing", async () => {
    const marks: string[] = [];
    const measures: string[][] = [];
    const cleared: string[] = [];
    const recorder = createUserTimingPerformanceRecorder({
      mark(name) {
        marks.push(name);
      },
      measure(name, startMark, endMark) {
        measures.push([name, startMark, endMark]);
      },
      clearMarks(name) {
        if (name !== undefined) cleared.push(name);
      },
    });

    const result = await recorder.measure("month.begin", async () => "begun");

    expect(result).toBe("begun");
    expect(marks).toEqual(["runtime-human:month.begin:0:start", "runtime-human:month.begin:0:end"]);
    expect(measures).toEqual([
      [
        "runtime-human:month.begin:fulfilled",
        "runtime-human:month.begin:0:start",
        "runtime-human:month.begin:0:end",
      ],
    ]);
    expect(cleared).toEqual(marks);
  });

  it("never lets User Timing failures alter an authoritative operation", async () => {
    const recorder = createUserTimingPerformanceRecorder({
      mark() {
        throw new Error("User Timing unavailable");
      },
      measure() {
        throw new Error("User Timing unavailable");
      },
      clearMarks() {
        throw new Error("User Timing unavailable");
      },
    });

    await expect(recorder.measure("month.commit", async () => "committed")).resolves.toBe(
      "committed",
    );
  });
});

function sequence(values: readonly number[]): () => number {
  const remaining = [...values];
  return () => {
    const value = remaining.shift();
    if (value === undefined) throw new Error("Performance test clock was exhausted");
    return value;
  };
}
