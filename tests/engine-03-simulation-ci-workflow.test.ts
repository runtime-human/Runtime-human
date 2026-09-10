import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const WORKFLOW_URL = new URL("../.github/workflows/foundation.yml", import.meta.url);

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_URL, "utf8");
}

describe("ENGINE-03 simulation regression CI workflow", () => {
  it("classifies gameplay-affecting PRs through the existing Studio authority model", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("name: Classify simulation regression scope");
    expect(workflow).toContain(
      'pnpm studioctl inspect --base "${{ steps.tested-parents.outputs.base_sha }}" --head "${{ steps.tested-parents.outputs.head_sha }}" --json',
    );
    expect(workflow).toContain(
      "$inspection.authorityImpact.gameplay -or $inspection.authorityImpact.schema",
    );
    expect(workflow).toContain(
      '$simulationZones = @("core", "application", "content", "balance", "scenario", "simulation")',
    );
    expect(workflow).toContain("$inspection.authorityImpact.ciGovernance");
  });

  it("rejects a synthetic merge whose exact base parent is stale", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('if ($baseSha -ne "${{ github.event.pull_request.base.sha }}") {');
    expect(workflow).toContain("tested PR base parent does not match pull request base");
  });

  it("runs one canonical corpus on the exact PR base and head then compares V4 reports", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("name: Run canonical base simulation");
    expect(workflow).toContain(
      'git checkout --detach "${{ steps.tested-parents.outputs.base_sha }}"',
    );
    expect(workflow).toContain("name: Run canonical head simulation");
    expect(workflow).toContain(
      'git checkout --detach "${{ steps.tested-parents.outputs.head_sha }}"',
    );
    expect(
      workflow.match(/gamectl-entry\.ts simulate run --corpus january-1990-canonical-v1 --json/g),
    ).toHaveLength(2);
    expect(workflow).toContain("name: Compare canonical simulation reports");
    expect(workflow).toContain("gamectl-entry.ts simulate compare");
  });

  it("preserves complete multiline gamectl JSON before parsing and artifacting", async () => {
    const workflow = await readWorkflow();

    expect(workflow.match(/\$jsonText = \$output -join \[Environment\]::NewLine/g)).toHaveLength(3);
    expect(workflow.match(/\$jsonText \| Set-Content -Path/g)).toHaveLength(3);
    expect(workflow.match(/\$jsonText \| ConvertFrom-Json/g)).toHaveLength(3);
  });

  it("publishes summary and artifacts before preserving a simulation failure", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("name: Summarize simulation regression evidence");
    expect(workflow).toContain("Runtime Human simulation regression");
    expect(workflow).toContain("$env:GITHUB_STEP_SUMMARY");
    expect(workflow).toContain("name: Upload simulation regression evidence");
    expect(workflow).toContain("retention-days: 7");
    expect(workflow).toContain("name: Preserve simulation regression failure");

    const summaryIndex = workflow.indexOf("name: Summarize simulation regression evidence");
    const uploadIndex = workflow.indexOf("name: Upload simulation regression evidence");
    const gateIndex = workflow.indexOf("name: Preserve simulation regression failure");
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(uploadIndex).toBeGreaterThan(summaryIndex);
    expect(gateIndex).toBeGreaterThan(uploadIndex);
  });

  it("materializes and proves a deterministic hard-regression repro before summary and artifact upload", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("name: Materialize and replay deterministic simulation failure");
    expect(workflow).toContain("failure.repro.json");
    expect(workflow).toContain("repro-materialization.json");
    expect(workflow).toContain("replay.json");
    expect(workflow).toContain("gamectl-entry.ts simulate repro");
    expect(workflow).toContain("gamectl-entry.ts replay");
    expect(workflow).toContain('result.kind -ne "reproduced"');
    expect(workflow).toContain("pnpm gamectl replay failure.repro.json --json");

    const reproIndex = workflow.indexOf(
      "name: Materialize and replay deterministic simulation failure",
    );
    const summaryIndex = workflow.indexOf("name: Summarize simulation regression evidence");
    const uploadIndex = workflow.indexOf("name: Upload simulation regression evidence");
    const gateIndex = workflow.indexOf("name: Preserve simulation regression failure");
    expect(reproIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(reproIndex);
    expect(uploadIndex).toBeGreaterThan(summaryIndex);
    expect(gateIndex).toBeGreaterThan(uploadIndex);
  });

  it("binds simulation evidence into exact PR evidence materialization", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("--simulation-evidence-dir");
    expect(workflow).toContain("--simulation-artifact");
  });

  it("keeps the regression job read-only and does not use pull_request_target", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).toContain("$env:RUNNER_TEMP");
  });
});
