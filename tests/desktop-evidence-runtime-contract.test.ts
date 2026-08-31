import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MAIN_PATH = resolve("apps/desktop/src-tauri/src/main.rs");
const DIAGNOSTICS_PATH = resolve("apps/desktop/src-tauri/src/diagnostics.rs");
const CAPTURE_WORKFLOW_PATH = resolve(".github/workflows/perf-02a-e2-windows-capture.yml");
const FOUNDATION_WORKFLOW_PATH = resolve(".github/workflows/foundation.yml");
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
    expect(workflow).not.toContain(
      'git commit -m "fix: materialize validated Windows evidence runtime"',
    );
    expect(workflow).not.toContain("git push origin HEAD:agent/perf-02a-windows-capture-harness");
  });

  it("normalizes Node only inside the type-aware lint cmd process", async () => {
    const [capture, foundation] = await Promise.all([
      readFile(CAPTURE_WORKFLOW_PATH, "utf8"),
      readFile(FOUNDATION_WORKFLOW_PATH, "utf8"),
    ]);

    for (const workflow of [capture, foundation]) {
      expect(workflow).toContain("NODE_EXECUTABLE");
      expect(workflow).toContain("PNPM_CONFIG_SCRIPT_SHELL");
      expect(workflow).toContain("Get-Command pwsh");
      expect(workflow).toContain("pnpm config get scriptShell");
      expect(workflow).toContain('$pnpmCommand = Join-Path $nodeDirectory "pnpm.cmd"');
      expect(workflow).toContain('$cmdCommand = Join-Path $env:SystemRoot "System32\\cmd.exe"');
      expect(workflow).toContain('set "PATH={0};{1};%PATH%"');
      expect(workflow).toContain("& $cmdCommand /d /s /c $lintCommand");
      expect(workflow).toContain("$nodeDirectory | Out-File -FilePath $env:GITHUB_PATH");
      expect(workflow).not.toContain('$env:Path = "$nodeDirectory;$env:Path"');
      expect(workflow).not.toContain('"PATH=$nodeDirectory;$workspaceBin;$env:PATH"');
      expect(workflow).not.toContain("node.cmd");
      expect(workflow).not.toContain("Create runner-local Node shim");
      expect(workflow).not.toContain("pnpm exec node --version");
    }

    expect(capture).toContain("Push-Location tools/desktop-evidence");
    expect(capture).toContain("& $env:NODE_EXECUTABLE --input-type=module");
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

  it("removes only allowlisted generated schemas and detects untracked build mutations", async () => {
    const workflow = await readFile(CAPTURE_WORKFLOW_PATH, "utf8");

    expect(workflow).toContain("git ls-files --error-unmatch");
    expect(workflow).toContain("Remove-Item $path -Force");
    expect(workflow).toContain("git status --porcelain --untracked-files=all");
    expect(workflow).toContain(
      "Evidence build changed reviewed sources outside the generated Tauri schema allowlist",
    );
  });
});
