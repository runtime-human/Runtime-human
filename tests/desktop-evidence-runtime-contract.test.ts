import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MAIN_PATH = resolve("apps/desktop/src-tauri/src/main.rs");
const DIAGNOSTICS_PATH = resolve("apps/desktop/src-tauri/src/diagnostics.rs");
const CAPTURE_WORKFLOW_PATH = resolve(".github/workflows/perf-02a-e2-windows-capture.yml");
const FOUNDATION_WORKFLOW_PATH = resolve(".github/workflows/foundation.yml");

describe("desktop evidence runtime contract", () => {
  it("records process entry before evidence-only setup", async () => {
    const source = await readFile(MAIN_PATH, "utf8");
    const processEntry = source.indexOf(
      "performance.record_once(DesktopPerformanceEventName::ProcessEntry);",
    );
    const evidenceSetup = source.indexOf("evidence::configure_webview_data_directory()");

    expect(processEntry).toBeGreaterThanOrEqual(0);
    expect(evidenceSetup).toBeGreaterThanOrEqual(0);
    expect(processEntry).toBeLessThan(evidenceSetup);
  });

  it("preserves the closed production logging filter", async () => {
    const source = await readFile(DIAGNOSTICS_PATH, "utf8");

    expect(source).toContain("fn filter_directive(debug_build: bool, rust_log: Option<&str>)");
    expect(source).toContain("fn debug_log_level(value: &str) -> Option<&'static str>");
    expect(source).toContain("fn release_filter_ignores_rust_log()");
    expect(source).toContain("fn debug_filter_accepts_only_closed_crate_levels()");
    expect(source).not.toContain("EnvFilter::try_new(rust_log.unwrap_or(fallback))");
  });

  it("measures the reviewed branch head without mutating product sources in CI", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("cargo check --locked");
    expect(workflow).toContain("pnpm fmt:check");
    expect(workflow).toContain("MEASURED_COMMIT");
    expect(workflow).toContain("git rev-parse HEAD");
    expect(workflow).not.toContain("apply-persistence-telemetry-contract.mjs");
    expect(workflow).not.toContain("pnpm install --no-frozen-lockfile");
    expect(workflow).not.toContain("pnpm fmt\n");
    expect(workflow).not.toContain("git commit -m \"fix: materialize validated Windows evidence runtime\"");
    expect(workflow).not.toContain("git push origin HEAD:agent/perf-02a-windows-capture-harness");
  });

  it("keeps Node available to pnpm child scripts after Rust setup", async () => {
    const [capture, foundation] = await Promise.all([
      readFile(CAPTURE_WORKFLOW_PATH, "utf8"),
      readFile(FOUNDATION_WORKFLOW_PATH, "utf8"),
    ]);

    for (const workflow of [capture, foundation]) {
      expect(workflow).toContain("NODE_EXECUTABLE");
      expect(workflow).toContain("node_modules\\.bin");
      expect(workflow).toContain("node.cmd");
      expect(workflow).toContain("Create runner-local Node shim");
    }
  });

  it("removes only allowlisted generated schemas and detects untracked build mutations", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("git ls-files --error-unmatch");
    expect(workflow).toContain("Remove-Item $path -Force");
    expect(workflow).toContain("git status --porcelain --untracked-files=all");
    expect(workflow).not.toContain("git restore --worktree -- $path\n");
  });
});
