import { describe, expect, it } from "vitest";

import { runJanuary1990PerformanceBaseline } from "./helpers/january-1990-performance-baseline";

describe("January 1990 performance baseline", () => {
  it("summarizes a complete playable workload without authoritative payloads", async () => {
    const baseline = await runJanuary1990PerformanceBaseline({ warmupRuns: 0, measuredRuns: 2 });

    expect(baseline).toMatchObject({
      schemaVersion: "january-1990-performance-baseline-v1",
      scenario: {
        content: "published-compiled-content",
        persistence: "in-memory-persistence-harness",
        seed: 42,
        choices: ["home-pc", "edit-and-debug", "inspect-listing"],
        warmupRuns: 0,
        measuredRuns: 2,
      },
    });
    expect(Object.fromEntries(baseline.timings.map((timing) => [timing.name, timing.count]))).toEqual({
      "app.session_bootstrap": 2,
      "content.load_chunk": 4,
      "content.load_manifest": 2,
      "content.publish_registry": 2,
      "month.begin": 2,
      "month.bootstrap_save": 2,
      "month.commit": 2,
      "month.load": 2,
      "month.resume": 4,
    });
    for (const timing of baseline.timings) {
      expect(Number.isSafeInteger(timing.minMicroseconds)).toBe(true);
      expect(timing.minMicroseconds).toBeLessThanOrEqual(timing.p50Microseconds);
      expect(timing.p50Microseconds).toBeLessThanOrEqual(timing.p95Microseconds);
      expect(timing.p95Microseconds).toBeLessThanOrEqual(timing.p99Microseconds);
      expect(timing.p99Microseconds).toBeLessThanOrEqual(timing.maxMicroseconds);
    }
    expect(JSON.stringify(baseline)).not.toMatch(/checkpoint|snapshot|saveId|runId/u);
  });

  it("rejects invalid run counts", async () => {
    await expect(
      runJanuary1990PerformanceBaseline({ warmupRuns: -1, measuredRuns: 1 }),
    ).rejects.toThrow("warmupRuns");
    await expect(
      runJanuary1990PerformanceBaseline({ warmupRuns: 0, measuredRuns: 0 }),
    ).rejects.toThrow("measuredRuns");
  });
});
