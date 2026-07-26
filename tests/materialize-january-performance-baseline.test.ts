/** @vitest-environment node */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { runJanuary1990PerformanceBaseline } from "./helpers/january-1990-performance-baseline";

const enabled = process.env.RUNTIME_HUMAN_MATERIALIZE_JANUARY_PERFORMANCE === "1";
const materialize = enabled ? describe : describe.skip;
const OUTPUT_PATH = join(
  process.cwd(),
  "artifacts",
  "performance",
  "january-1990-performance-baseline-v1.json",
);

materialize("materialize January performance baseline", () => {
  it("writes the measured playable workload summary", async () => {
    const baseline = await runJanuary1990PerformanceBaseline({
      warmupRuns: 5,
      measuredRuns: 30,
    });
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");

    expect(baseline.timings).toHaveLength(9);
  });
});
