import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { cleanupWdioSession, startWdioSession } from "@wdio/tauri-service";

import { captureBrowserEntries, waitForFirstMeaningfulPaint } from "./capture-browser.js";
import { createStartupEvidenceCapabilities } from "./capture-capabilities.js";
import { captureWindowsHostProfile } from "./capture-host.js";
import { parseStartupCaptureArguments } from "./capture-options.js";
import { captureRustPerformanceSnapshot } from "./capture-rust.js";
import type { EvidenceBrowser } from "./wdio-types.js";
import { writeValidatedCapture } from "./write-capture.js";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");

type CaptureLifecycleStage =
  | "options-validated"
  | "temporary-state-created"
  | "capabilities-created"
  | "session-starting"
  | "session-started"
  | "fmp-waiting"
  | "fmp-observed"
  | "snapshot-captured"
  | "capture-written"
  | "cleanup-starting"
  | "cleanup-complete";

export async function captureStartupShellFmp(arguments_: readonly string[]): Promise<string> {
  const options = parseStartupCaptureArguments(arguments_, REPOSITORY_ROOT);
  await access(options.binaryPath);
  recordStage("options-validated");

  const isolatedDataDirectory = await mkdtemp(join(tmpdir(), "runtime-human-desktop-evidence-"));
  recordStage("temporary-state-created");
  let browser: EvidenceBrowser | undefined;
  try {
    const capabilities = createStartupEvidenceCapabilities(
      options.binaryPath,
      isolatedDataDirectory,
    );
    recordStage("capabilities-created");

    recordStage("session-starting");
    browser = await startWdioSession(capabilities, {
      rootDir: REPOSITORY_ROOT,
      autoDownloadEdgeDriver: true,
      autoInstallTauriDriver: false,
    });
    recordStage("session-started");

    recordStage("fmp-waiting");
    await waitForFirstMeaningfulPaint(browser);
    recordStage("fmp-observed");

    const [browserEntries, rustSnapshot] = await Promise.all([
      captureBrowserEntries(browser),
      captureRustPerformanceSnapshot(browser),
    ]);
    recordStage("snapshot-captured");
    await writeValidatedCapture(options.outputPath, {
      schemaVersion: "runtime-human-desktop-performance-capture-v1",
      commit: options.commit,
      host: captureWindowsHostProfile(),
      scenario: "startup-shell-fmp",
      classification: {
        process: options.process,
        osCache: options.osCache,
        database: options.database,
        sampleRole: options.sampleRole,
      },
      sampleIndex: options.sampleIndex,
      externalDurationsMicros: {},
      rustSnapshot,
      browserEntries,
    });
    recordStage("capture-written");
    return options.outputPath;
  } finally {
    recordStage("cleanup-starting");
    try {
      if (browser !== undefined) {
        await cleanupWdioSession(browser);
      }
    } finally {
      await rm(isolatedDataDirectory, { recursive: true, force: true });
      recordStage("cleanup-complete");
    }
  }
}

function recordStage(stage: CaptureLifecycleStage): void {
  console.log(`RUNTIME_HUMAN_EVIDENCE stage=${stage}`);
}

function isDirectExecution(moduleUrl: string, scriptPath: string | undefined): boolean {
  return scriptPath !== undefined && moduleUrl === pathToFileURL(resolve(scriptPath)).href;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  captureStartupShellFmp(process.argv.slice(2))
    .then((outputPath) => {
      console.log(`Wrote startup-shell-fmp capture to ${outputPath}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
