import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MAIN_PATH = resolve("apps/desktop/src-tauri/src/main.rs");
const DIAGNOSTICS_PATH = resolve("apps/desktop/src-tauri/src/diagnostics.rs");
const CAPTURE_WORKFLOW_PATH = resolve(".github/workflows/perf-02a-e2-windows-capture.yml");
const CAPTURE_STARTUP_PATH = resolve("tools/desktop-evidence/src/capture-startup.ts");
const PNPM_WORKSPACE_PATH = resolve("pnpm-workspace.yaml");
const TESTS_TSCONFIG_PATH = resolve("tests/tsconfig.json");

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

  it("runs only on GitHub-hosted Windows with a read-only token", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("runs-on: windows-2025");
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("runs-on: self-hosted");
    expect(workflow).not.toMatch(/[A-Z]:\\Users\\/i);
    expect(workflow).not.toMatch(/[A-Z]:\\actions-runner/i);
  });

  it("refreshes opt-in capture for every synchronized PR head and cancels stale evidence", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("types: [labeled, synchronize]");
    expect(workflow).toContain(
      "group: ${{ github.workflow }}-${{ github.event.pull_request.number }}",
    );
    expect(workflow).toContain("github.event.action == 'labeled'");
    expect(workflow).toContain("github.event.label.name == 'perf:e2-capture'");
    expect(workflow).toContain("github.event.action == 'synchronize'");
    expect(workflow).toContain(
      "contains(github.event.pull_request.labels.*.name, 'perf:e2-capture')",
    );
    expect(workflow).toContain("cancel-in-progress: true");
  });

  it("measures the exact reviewed PR head without mutating product sources", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("cargo check --locked");
    expect(workflow).toContain("MEASURED_COMMIT");
    expect(workflow).toContain("git rev-parse HEAD");
    expect(workflow).toContain('expectedCommit = "${{ github.event.pull_request.head.sha }}"');
    expect(workflow).not.toContain("apply-persistence-telemetry-contract.mjs");
    expect(workflow).not.toContain("pnpm install --no-frozen-lockfile");
    expect(workflow).not.toContain("git commit");
    expect(workflow).not.toContain("git push");
  });

  it("uses only the embedded Tauri WebDriver transport", async () => {
    const [captureStartup, workspace] = await Promise.all([
      readFile(CAPTURE_STARTUP_PATH, "utf8"),
      readFile(PNPM_WORKSPACE_PATH, "utf8"),
    ]);

    expect(captureStartup).toContain("autoDownloadEdgeDriver: false");
    expect(captureStartup).toContain("autoInstallTauriDriver: false");
    expect(workspace).toContain("edgedriver: false");
    expect(workspace).not.toContain("edgedriver: true");
  });

  it("publishes bounded runner provenance without leaking absolute cleanup paths", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("runtime-human-e2-run-provenance-v1");
    expect(workflow).toContain("artifacts/performance/e2-run-provenance.json");
    expect(workflow).toContain("runnerOS");
    expect(workflow).toContain("runnerArch");
    expect(workflow).toContain("imageOS");
    expect(workflow).toContain("imageVersion");
    expect(workflow).toContain("Split-Path -Leaf");
    expect(workflow).not.toContain("$($leaked -join ', ')");
    expect(workflow).not.toContain("Get-ChildItem Env:");
  });

  it("keeps the evidence tool as an explicit TypeScript project dependency", async () => {
    const config = await readFile(TESTS_TSCONFIG_PATH, "utf8");

    expect(config).toContain('{ "path": "../tools/desktop-evidence" }');
    expect(config).not.toContain('"../tools/desktop-evidence/src/**/*.ts"');
  });

  it("runs source gates before Rust schema generation and cleans before pinning", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");
    const formatting = workflow.indexOf("- name: Check formatting");
    const rustGraph = workflow.indexOf("- name: Check evidence Rust feature graph");
    const rustCleanup = workflow.indexOf("- name: Restore only Rust-generated Tauri schemas");
    const exactHead = workflow.indexOf("- name: Pin exact reviewed product head");

    expect(formatting).toBeGreaterThanOrEqual(0);
    expect(rustGraph).toBeGreaterThanOrEqual(0);
    expect(rustCleanup).toBeGreaterThanOrEqual(0);
    expect(exactHead).toBeGreaterThanOrEqual(0);
    expect(formatting).toBeLessThan(rustGraph);
    expect(rustGraph).toBeLessThan(rustCleanup);
    expect(rustCleanup).toBeLessThan(exactHead);
  });

  it("removes only allowlisted generated schemas and detects build mutations", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("git ls-files --error-unmatch");
    expect(workflow).toContain("Remove-Item $path -Force");
    expect(workflow).toContain("git status --porcelain --untracked-files=all");
    expect(workflow).toContain(
      "Evidence build changed reviewed sources outside the generated Tauri schema allowlist",
    );
  });
});
