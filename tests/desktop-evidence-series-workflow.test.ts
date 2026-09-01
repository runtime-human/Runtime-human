import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const WORKFLOW_PATH = resolve(
  process.cwd(),
  ".github",
  "workflows",
  "perf-02a-e2-windows-capture.yml",
);

describe("desktop E3 series workflow contract", () => {
  it("keeps the physical series opt-in, exact-head, hosted and read-only", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("perf:e3-series");
    expect(workflow).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(workflow).toContain("runs-on: windows-2025");
    expect(workflow).toMatch(/permissions:\s*\n\s*contents: read/u);
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).not.toContain("self-hosted");
  });

  it("captures one truthful startup group sequentially and validates it in strict E3 mode", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("E3_WARMUP_COUNT=5");
    expect(workflow).toContain("E3_MEASUREMENT_COUNT=30");
    expect(workflow).toContain("--process=cold-process");
    expect(workflow).toContain("--os-cache=warm-os-cache");
    expect(workflow).toContain("--database=new-database");
    expect(workflow).toContain("--sample-role=warmup");
    expect(workflow).toContain("--sample-role=measurement");
    expect(workflow).toContain("--sample-index=$index");
    expect(workflow).toContain('"--series=e3"');
    expect(workflow).toContain("e3-startup-shell-fmp-report.json");
  });

  it("preserves raw captures, provenance and the strict report as one bounded artifact", async () => {
    const workflow = await readFile(WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("perf-02a-e3-series-${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("artifacts/performance/raw/startup-shell-fmp-cold-process-warm-os-cache-new-database-*.json");
    expect(workflow).toContain("artifacts/performance/e3-startup-shell-fmp-report.json");
    expect(workflow).toContain("artifacts/performance/e3-run-provenance.json");
    expect(workflow).toContain("retention-days: 14");
    expect(workflow).toContain("if-no-files-found: error");
  });
});
