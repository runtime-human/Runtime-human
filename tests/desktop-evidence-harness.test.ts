import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  captureBrowserEntries,
  waitForFirstMeaningfulPaint,
} from "../tools/desktop-evidence/src/capture-browser";
import { parseStartupCaptureArguments } from "../tools/desktop-evidence/src/capture-options";
import { captureRustPerformanceSnapshot } from "../tools/desktop-evidence/src/capture-rust";
import type { EvidenceBrowser } from "../tools/desktop-evidence/src/wdio-types";
import { writeValidatedCapture } from "../tools/desktop-evidence/src/write-capture";

const COMMIT = "783f54b17cd7bd4b88c5e7aac4719afa1c0dadac";

function fakeBrowser(overrides: Readonly<Record<string, unknown>>): EvidenceBrowser {
  return overrides as unknown as EvidenceBrowser;
}

function validCapture() {
  return {
    schemaVersion: "runtime-human-desktop-performance-capture-v1",
    commit: COMMIT,
    host: {
      os: "windows",
      arch: "x64",
      logicalProcessors: 8,
      memoryMiB: 16_384,
      cpuModel: "Evidence Harness Test CPU",
    },
    scenario: "startup-shell-fmp",
    classification: {
      process: "warm-process",
      osCache: "warm-os-cache",
      database: "new-database",
      sampleRole: "warmup",
    },
    sampleIndex: 0,
    externalDurationsMicros: {},
    rustSnapshot: {
      schemaVersion: "runtime-human-desktop-performance-snapshot-v1",
      events: [
        rustMark("processEntry", 0),
        rustMark("tauriSetupStart", 100),
        rustMark("persistenceWorkerReady", 3_000),
        rustMark("tauriSetupComplete", 4_000),
        rustMark("mainWindowAvailable", 6_000),
      ],
      droppedEvents: 0,
    },
    browserEntries: [
      browserMark("app.renderer_bootstrap", 0),
      browserMark("app.react_shell_commit", 1_000),
      browserMark("app.january_session_ready", 4_000),
      browserMark("app.first_meaningful_paint", 5_000),
    ],
  };
}

function rustMark(name: string, atMicros: number) {
  return {
    name,
    atMicros,
    durationMicros: null,
    category: null,
    operationId: null,
    queueDepth: null,
  };
}

function browserMark(name: string, startMicros: number) {
  return { name, entryType: "mark", startMicros, durationMicros: 0 };
}

describe("desktop evidence harness", () => {
  it("requires explicit evidence classifications and resolves default paths", () => {
    const repositoryRoot = resolve("repository-root");
    const options = parseStartupCaptureArguments(
      [
        `--commit=${COMMIT}`,
        "--process=warm-process",
        "--os-cache=warm-os-cache",
        "--database=new-database",
        "--sample-role=warmup",
        "--sample-index=7",
      ],
      repositoryRoot,
    );

    expect(options).toEqual({
      binaryPath: resolve(
        repositoryRoot,
        "apps/desktop/src-tauri/target/release/runtime-human-desktop.exe",
      ),
      commit: COMMIT,
      outputPath: resolve(
        repositoryRoot,
        "artifacts/performance/raw/startup-shell-fmp-7.json",
      ),
      process: "warm-process",
      osCache: "warm-os-cache",
      database: "new-database",
      sampleRole: "warmup",
      sampleIndex: 7,
    });
  });

  it("rejects guessed, duplicate and malformed startup options", () => {
    expect(() => parseStartupCaptureArguments([`--commit=${COMMIT}`])).toThrow(
      /--sample-index is required/u,
    );
    expect(() =>
      parseStartupCaptureArguments([
        `--commit=${COMMIT}`,
        "--commit=783f54b17cd7bd4b88c5e7aac4719afa1c0dadac",
        "--process=warm-process",
        "--os-cache=warm-os-cache",
        "--database=new-database",
        "--sample-role=warmup",
        "--sample-index=0",
      ]),
    ).toThrow(/may be specified only once/u);
    expect(() =>
      parseStartupCaptureArguments([
        `--commit=${COMMIT}`,
        "--process=unknown-process",
        "--os-cache=warm-os-cache",
        "--database=new-database",
        "--sample-role=warmup",
        "--sample-index=0",
      ]),
    ).toThrow(/--process has an unsupported value/u);
  });

  it("waits for FMP and normalizes browser timing entries", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce([
        {
          name: "app.first_meaningful_paint",
          entryType: "mark",
          startMicros: 5_000,
          durationMicros: 0,
        },
        {
          name: "app.renderer_bootstrap",
          entryType: "mark",
          startMicros: 0,
          durationMicros: 0,
        },
      ]);
    const waitUntil = vi.fn(async (condition: () => Promise<boolean>) => {
      expect(await condition()).toBe(true);
      return true;
    });
    const browser = fakeBrowser({ execute, waitUntil });

    await waitForFirstMeaningfulPaint(browser, 50);
    const entries = await captureBrowserEntries(browser);

    expect(waitUntil).toHaveBeenCalledOnce();
    expect(entries).toEqual([
      {
        name: "app.renderer_bootstrap",
        entryType: "mark",
        startMicros: 0,
        durationMicros: 0,
      },
      {
        name: "app.first_meaningful_paint",
        entryType: "mark",
        startMicros: 5_000,
        durationMicros: 0,
      },
    ]);
  });

  it("reads the exact Rust performance snapshot through renderer invoke", async () => {
    const snapshot = validCapture().rustSnapshot;
    const browser = fakeBrowser({ execute: vi.fn().mockResolvedValue(snapshot) });

    await expect(captureRustPerformanceSnapshot(browser)).resolves.toEqual(snapshot);
  });

  it("validates before writing a raw capture", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runtime-human-evidence-harness-"));
    const outputPath = join(directory, "raw", "capture.json");

    const written = await writeValidatedCapture(outputPath, validCapture());
    const disk = JSON.parse(await readFile(outputPath, "utf8")) as {
      schemaVersion: string;
      sampleIndex: number;
    };
    expect(written.schemaVersion).toBe("runtime-human-desktop-performance-capture-v1");
    expect(disk).toMatchObject({
      schemaVersion: "runtime-human-desktop-performance-capture-v1",
      sampleIndex: 0,
    });

    await expect(
      writeValidatedCapture(join(directory, "invalid.json"), {
        ...validCapture(),
        scenario: "invented-scenario",
      }),
    ).rejects.toThrow(/unsupported value/u);
  });
});
