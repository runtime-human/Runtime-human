import { describe, expect, it } from "vitest";

import {
  createBrowserPerformanceRecorder,
  NOOP_PERFORMANCE_RECORDER,
  type UserTimingPort,
} from "../apps/desktop/src/performance/performance-recorder";

describe("browser performance recorder", () => {
  it("records one unique User Timing measure and preserves the result", async () => {
    const calls: string[] = [];
    const port: UserTimingPort = {
      mark(name) {
        calls.push(`mark:${name}`);
      },
      measure(name, options) {
        calls.push(`measure:${name}:${options.start}`);
      },
      clearMarks(name) {
        calls.push(`clear:${name}`);
      },
    };
    const recorder = createBrowserPerformanceRecorder(port);

    await expect(recorder.measure("month.load", async () => 42)).resolves.toBe(42);

    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatch(/^mark:runtime-human:month\.load:1:start$/u);
    expect(calls[1]).toBe("measure:month.load:runtime-human:month.load:1:start");
    expect(calls[2]).toBe("clear:runtime-human:month.load:1:start");
  });

  it("never lets timing-port failures change a successful operation", async () => {
    const recorder = createBrowserPerformanceRecorder({
      mark() {
        throw new Error("mark failed");
      },
      measure() {
        throw new Error("measure failed");
      },
      clearMarks() {
        throw new Error("clear failed");
      },
    });

    await expect(recorder.measure("app.session_bootstrap", async () => "ok")).resolves.toBe("ok");
  });

  it("preserves the original operation error even when cleanup also fails", async () => {
    const operationError = new Error("authoritative operation failed");
    const recorder = createBrowserPerformanceRecorder({
      mark() {},
      measure() {
        throw new Error("measure failed");
      },
      clearMarks() {
        throw new Error("clear failed");
      },
    });

    await expect(
      recorder.measure("month.commit", async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);
  });

  it("provides a transparent no-op recorder", async () => {
    await expect(
      NOOP_PERFORMANCE_RECORDER.measure("content.registry", async () => 7),
    ).resolves.toBe(7);
  });
});
