import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MAIN_PATH = resolve("apps/desktop/src-tauri/src/main.rs");
const DIAGNOSTICS_PATH = resolve("apps/desktop/src-tauri/src/diagnostics.rs");

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
});
