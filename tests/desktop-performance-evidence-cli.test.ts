import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  parseDesktopEvidenceArguments,
  runDesktopEvidenceCli,
} from "../scripts/run-desktop-performance-evidence.mjs";

const COMMIT = "6472f5c3fac508cdc4cf2827aec34dcd15d8916d";

function capture(sampleIndex: number) {
  return {
    schemaVersion: "runtime-human-desktop-performance-capture-v1",
    commit: COMMIT,
    host: {
      os: "windows",
      arch: "x64",
      logicalProcessors: 8,
      memoryMiB: 16_384,
      cpuModel: "CLI Test CPU",
    },
    scenario: "startup-shell-fmp",
    classification: {
      process: "cold-process",
      osCache: "warm-os-cache",
      database: "existing-clean-database",
      sampleRole: "measurement",
    },
    sampleIndex,
    externalDurationsMicros: {
      processToShellFmpMicros: 20_000 + sampleIndex,
    },
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

describe("desktop performance evidence CLI", () => {
  it("parses repeated inputs and one explicit output", () => {
    expect(
      parseDesktopEvidenceArguments([
        "--",
        "--input=first.json",
        "--input=second.json",
        "--output=result.json",
      ]),
    ).toEqual({
      inputs: ["first.json", "second.json"],
      output: "result.json",
    });
  });

  it("rejects missing inputs, duplicate outputs and unknown options", () => {
    expect(() => parseDesktopEvidenceArguments([])).toThrow(/at least one --input/u);
    expect(() =>
      parseDesktopEvidenceArguments([
        "--input=one.json",
        "--output=one-report.json",
        "--output=two-report.json",
      ]),
    ).toThrow(/only one --output/u);
    expect(() => parseDesktopEvidenceArguments(["--input=one.json", "--other=value"])).toThrow(
      /unknown desktop evidence option/u,
    );
  });

  it("reads object and array captures and writes one deterministic report", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runtime-human-desktop-evidence-cli-"));
    const firstInput = join(directory, "first.json");
    const secondInput = join(directory, "second.json");
    const output = join(directory, "nested", "report.json");
    await writeFile(firstInput, `${JSON.stringify(capture(1))}\n`, "utf8");
    await writeFile(secondInput, `${JSON.stringify([capture(0), capture(2)])}\n`, "utf8");
    const log = vi.fn();

    const report = await runDesktopEvidenceCli(
      [
        `--input=${firstInput}`,
        `--input=${secondInput}`,
        `--output=${output}`,
      ],
      log,
    );

    const written = JSON.parse(await readFile(output, "utf8")) as {
      schemaVersion: string;
      measurementCount: number;
      captures: readonly { sampleIndex: number }[];
    };
    expect(written.schemaVersion).toBe("runtime-human-desktop-performance-evidence-v1");
    expect(written.measurementCount).toBe(3);
    expect(written.captures.map((item) => item.sampleIndex)).toEqual([0, 1, 2]);
    expect(report).toEqual(written);
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(`Wrote 3 measurement capture(s) to ${output}`);
  });
});
