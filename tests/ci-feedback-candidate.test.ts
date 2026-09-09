import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("remote CI feedback and candidate V3", () => {
  it("keeps ordinary PR iteration on a cheap read-only feedback gate", () => {
    const feedback = read(".github/workflows/feedback.yml");

    expect(feedback).toContain("name: feedback");
    expect(feedback).toMatch(/pull_request:\s*[\s\S]*?types:\s*[\s\S]*?- opened/u);
    expect(feedback).toMatch(/types:\s*[\s\S]*?- synchronize/u);
    expect(feedback).toMatch(/types:\s*[\s\S]*?- reopened/u);
    expect(feedback).toContain("contents: read");
    expect(feedback).toContain("runs-on: windows-2025");
    expect(feedback).toContain("cancel-in-progress: true");
    expect(feedback).toContain("pnpm check:fast");
    expect(feedback).not.toContain("pnpm verify");
    expect(feedback).not.toContain("rustup toolchain install");
    expect(feedback).not.toContain("playwright install");
    expect(feedback).not.toContain("pull_request_target");
  });

  it("runs a bounded head-only simulation smoke for Studio-classified affected PRs", () => {
    const feedback = read(".github/workflows/feedback.yml");

    expect(feedback).toContain("fetch-depth: 2");
    expect(feedback).toContain("name: Resolve exact tested PR parents");
    expect(feedback).toContain("tested PR base parent does not match pull request base");
    expect(feedback).toContain("tested PR head parent does not match pull request head");
    expect(feedback).toContain("name: Classify simulation smoke scope");
    expect(feedback).toContain(
      'pnpm studioctl inspect --base "${{ steps.tested-parents.outputs.base_sha }}" --head "${{ steps.tested-parents.outputs.head_sha }}" --json',
    );
    expect(feedback).toContain(
      '$simulationZones = @("core", "application", "content", "balance", "scenario", "simulation")',
    );
    expect(feedback).toContain("$inspection.authorityImpact.gameplay");
    expect(feedback).toContain("$inspection.authorityImpact.schema");
    expect(feedback).toContain("$inspection.authorityImpact.ciGovernance");
    expect(feedback).toContain("name: Run simulation smoke");
    expect(feedback).toContain("steps.simulation-smoke-scope.outputs.affected == 'true'");
    expect(feedback).toContain(
      "gamectl-entry.ts simulate run --corpus january-1990-smoke-v1 --json",
    );
    expect(feedback).toContain("Runtime Human simulation smoke");
    expect(feedback).toContain("$env:GITHUB_STEP_SUMMARY");
    expect(feedback).not.toContain("january-1990-canonical-v1");
  });

  it("refreshes explicit PR V3 candidates after their head synchronizes", () => {
    const foundation = read(".github/workflows/foundation.yml");

    expect(foundation).toMatch(/pull_request:\s*[\s\S]*?types:\s*\[labeled, synchronize\]/u);
    expect(foundation).toContain("github.event_name != 'pull_request'");
    expect(foundation).toContain("github.event.action == 'labeled'");
    expect(foundation).toContain("github.event.label.name == 'verify:v3'");
    expect(foundation).toContain("github.event.action == 'synchronize'");
    expect(foundation).toContain("contains(github.event.pull_request.labels.*.name, 'verify:v3')");
    expect(foundation).toContain("pnpm verify");
    expect(foundation).toContain("pnpm studioctl evidence");
    expect(foundation).toContain("january-1990-canonical-v1");
    expect(foundation).toContain("contents: read");
    expect(foundation).toContain("cancel-in-progress: true");
    expect(foundation).not.toContain("pull_request_target");
  });

  it("derives exact PR evidence from the tested synthetic merge parents", () => {
    const foundation = read(".github/workflows/foundation.yml");

    expect(foundation).toContain("git rev-list --parents -n 1");
    expect(foundation).toContain("tested PR commit must have exactly two parents");
    expect(foundation).toContain("tested PR head parent does not match pull request head");
    expect(foundation).toContain("steps.tested-parents.outputs.base_sha");
    expect(foundation).toContain("steps.tested-parents.outputs.head_sha");
    expect(foundation).not.toContain(
      'studioctl evidence --base "${{ github.event.pull_request.base.sha }}"',
    );
  });

  it("keeps the control-plane forcing function aligned with candidate refresh and smoke semantics", () => {
    const checker = read("scripts/studio/check-control-plane.mjs");

    expect(checker).toContain('"types: [labeled, synchronize]"');
    expect(checker).toContain("\"github.event.action == 'synchronize'\"");
    expect(checker).toContain("\"contains(github.event.pull_request.labels.*.name, 'verify:v3')\"");
    expect(checker).toContain('"name: Classify simulation smoke scope"');
    expect(checker).toContain('"january-1990-smoke-v1"');
  });

  it("retains full V3 on main and manual dispatch without duplicating command bodies", () => {
    const foundation = read(".github/workflows/foundation.yml");
    const feedback = read(".github/workflows/feedback.yml");

    expect(foundation).toMatch(/push:\s*[\s\S]*?branches:\s*[\s\S]*?- main/u);
    expect(foundation).toContain("workflow_dispatch:");
    expect(foundation.match(/pnpm verify/gu)?.length).toBe(1);
    expect(feedback.match(/pnpm check:fast/gu)?.length).toBe(1);
  });
});
