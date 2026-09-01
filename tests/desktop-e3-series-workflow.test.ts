import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const WORKFLOW_URL = new URL(
  "../.github/workflows/perf-02a-e3-windows-series.yml",
  import.meta.url,
);

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_URL, "utf8");
}

describe("PERF-02A E3 hosted Windows series workflow", () => {
  it("is an opt-in read-only exact-head workflow with fixed E3 coverage", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("name: perf-02a-e3-windows-series");
    expect(workflow).toContain("types: [labeled, synchronize]");
    expect(workflow).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(workflow).toContain("perf:e3-series");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("runs-on: windows-2025");
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("E3_WARMUP_COUNT: \"5\"");
    expect(workflow).toContain("E3_MEASUREMENT_COUNT: \"30\"");
    expect(workflow).toContain('"--series=e3"');

    expect(workflow.match(/pnpm evidence:desktop:build/g)).toHaveLength(1);
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).not.toContain("workflow_dispatch");
  });
});
