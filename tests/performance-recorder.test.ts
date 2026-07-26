import { describe, expect, it } from "vitest";

import {
  createPerformanceRecorder,
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

  it("rejects a clock that moves backwards", async () => {
    const recorder = createPerformanceRecorder({
      nowMilliseconds: sequence([2, 1]),
      onSample: () => undefined,
    });

    await expect(recorder.measure("app.session_bootstrap", async () => undefined)).rejects.toThrow(
      "Performance clock moved backwards",
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
