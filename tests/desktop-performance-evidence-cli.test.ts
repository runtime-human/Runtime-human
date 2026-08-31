import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";

import {
  parseDesktopEvidenceArguments,
  runDesktopEvidenceCli,
} from "../scripts/run-desktop-performance-evidence.mjs";

const execFileAsync = promisify(execFile);
const CLI_PATH = resolve(process.cwd(), "scripts", "run-desktop-performance-evidence.mjs");
const COMMIT = "6472f5c3fac508cdc4cf2827aec34dcd15d8916d";

function capture(sampleIndex: number, sampleRole: "warmup" | "measurement" = "measurement") {
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
      sampleRole,
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

function series(warmupCount: number, measurementCount: number) {
  return [
    ...Array.from({ length: warmupCount }, (_, index) => capture(index, "warmup")),
    ...Array.from({ length: measurementCount }, (_, index) => capture(index)),
  ];
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
    expect(() => parseDesktopEvidenceArguments([])).toThrow(/at least one --input/iu);
    expect(() =>
      parseDesktopEvidenceArguments([
        "--input=one.json",
        "--output=one-report.json",
        "--output=two-report.json",
      ]),
    ).toThrow(/only one --output/iu);
    expect(() => parseDesktopEvidenceArguments(["--input=one.json", "--other=value"])).toThrow(
      /unknown desktop evidence option/iu,
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
      [`--input=${firstInput}`, `--input=${secondInput}`, `--output=${output}`],
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

  it("enforces E3 series warmup and measurement coverage", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runtime-human-desktop-e3-series-"));
    const tooFewMeasurements = join(directory, "too-few-measurements.json");
    const tooFewWarmups = join(directory, "too-few-warmups.json");
    const completeSeries = join(directory, "complete-series.json");

    await writeFile(tooFewMeasurements, `${JSON.stringify(series(5, 29))}\n`, "utf8");
    await expect(
      runDesktopEvidenceCli([
        `--input=${tooFewMeasurements}`,
        `--output=${join(directory, "too-few-measurements-report.json")}`,
        "--series=e3",
      ]),
    ).rejects.toThrow(/at least 30 measurement/iu);

    await writeFile(tooFewWarmups, `${JSON.stringify(series(4, 30))}\n`, "utf8");
    await expect(
      runDesktopEvidenceCli([
        `--input=${tooFewWarmups}`,
        `--output=${join(directory, "too-few-warmups-report.json")}`,
        "--series=e3",
      ]),
    ).rejects.toThrow(/at least 5 warmup/iu);

    await writeFile(completeSeries, `${JSON.stringify(series(5, 30))}\n`, "utf8");
    const report = await runDesktopEvidenceCli([
      `--input=${completeSeries}`,
      `--output=${join(directory, "complete-report.json")}`,
      "--series=e3",
    ]);

    expect(report.warmupCount).toBe(5);
    expect(report.measurementCount).toBe(30);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]?.sampleCount).toBe(30);
  });

  it("runs as a shell-free Node executable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runtime-human-desktop-evidence-process-"));
    const input = join(directory, "capture.json");
    const output = join(directory, "report.json");
    await writeFile(input, `${JSON.stringify(capture(0))}\n`, "utf8");

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      CLI_PATH,
      `--input=${input}`,
      `--output=${output}`,
    ]);

    expect(stderr).toBe("");
    expect(stdout.trim()).toBe(`Wrote 1 measurement capture(s) to ${output}`);
    const written = JSON.parse(await readFile(output, "utf8")) as { measurementCount: number };
    expect(written.measurementCount).toBe(1);
  });
});
