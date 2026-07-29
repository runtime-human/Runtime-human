import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  cleanupWdioSession,
  createTauriCapabilities,
  startWdioSession,
} from "@wdio/tauri-service";

import { captureBrowserEntries, waitForFirstMeaningfulPaint } from "./capture-browser.js";
import { captureWindowsHostProfile } from "./capture-host.js";
import { parseStartupCaptureArguments } from "./capture-options.js";
import { captureRustPerformanceSnapshot } from "./capture-rust.js";
import type { EvidenceBrowser } from "./wdio-types.js";
import { writeValidatedCapture } from "./write-capture.js";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");

export async function captureStartupShellFmp(
  arguments_: readonly string[],
): Promise<string> {
  const options = parseStartupCaptureArguments(arguments_, REPOSITORY_ROOT);
  await access(options.binaryPath);

  const isolatedDataDirectory = await mkdtemp(
    join(tmpdir(), "runtime-human-desktop-evidence-"),
  );
  const capabilities = createTauriCapabilities(options.binaryPath, {
    appArgs: [`--runtime-human-evidence-data-dir=${isolatedDataDirectory}`],
    autoInstallTauriDriver: true,
    driverProvider: "external",
    logLevel: "warn",
    startTimeout: 120_000,
  });
  capabilities["wdio:tauriServiceOptions"] = {
    ...capabilities["wdio:tauriServiceOptions"],
    autoDownloadEdgeDriver: true,
    captureBackendLogs: false,
    captureFrontendLogs: false,
  };

  let browser: EvidenceBrowser | undefined;
  try {
    browser = await startWdioSession(capabilities, {
      rootDir: REPOSITORY_ROOT,
      autoDownloadEdgeDriver: true,
    });
    await waitForFirstMeaningfulPaint(browser);

    const [browserEntries, rustSnapshot] = await Promise.all([
      captureBrowserEntries(browser),
      captureRustPerformanceSnapshot(browser),
    ]);
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
    return options.outputPath;
  } finally {
    try {
      if (browser !== undefined) {
        await cleanupWdioSession(browser);
      }
    } finally {
      await rm(isolatedDataDirectory, { recursive: true, force: true });
    }
  }
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
