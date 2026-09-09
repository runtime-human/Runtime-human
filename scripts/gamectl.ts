import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { parse as parseJsonc } from "jsonc-parser";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import { compileBalanceSet, loadBalanceSourceFiles } from "@runtime-human/game-content-compiler";
import {
  createCompiledContentRuntime,
  JANUARY_1990_SCENARIO_ARTIFACT,
} from "@runtime-human/game-content";
import {
  canonicalizeAuthoritative,
  fingerprint,
  JANUARY_1990_BALANCE_SLICE_ID,
  parseJanuary1990Balance,
} from "@runtime-human/game-core";
import {
  createJanuary1990SimulationV4,
  diffSimulationReportsV1,
  JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1,
  parseSimulationReportV4,
  SIMULATION_REPORT_SCHEMA_VERSION_V4,
  type SimulationDiffV1,
} from "@runtime-human/game-simulation";

import { runGamectlCli as runCoreGamectlCli, type GamectlIo } from "./gamectl-core";
import { runScenarioGamectlCli } from "./gamectl-scenario";

export type { GamectlIo } from "./gamectl-core";

const ENVELOPE_SCHEMA_VERSION = "runtime-human-gamectl-v1" as const;

type CanonicalCorpusValues = Readonly<{
  json: boolean;
  quiet: boolean;
  root?: string | undefined;
  corpus?: string | undefined;
  seeds?: string | undefined;
  fixture?: string | undefined;
  policies?: string | undefined;
}>;

type SimulationCompareValues = Readonly<{
  json: boolean;
  quiet: boolean;
  root?: string | undefined;
  base?: string | undefined;
  candidate?: string | undefined;
  threshold?: readonly string[] | undefined;
}>;

type LoadedSimulationReport =
  | Readonly<{ kind: "ok"; value: unknown }>
  | Readonly<{
      kind: "failure";
      code: "report-not-found" | "file-unreadable";
      message: string;
      exitCode: 2 | 4;
    }>;

export async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const compareExit = await runSimulationCompareV4Cli(argv, io);
  if (compareExit !== null) return compareExit;

  const corpusExit = await runCanonicalCorpusCli(argv, io);
  if (corpusExit !== null) return corpusExit;

  const scenarioExit = await runScenarioGamectlCli(argv, io);
  if (scenarioExit !== null) return scenarioExit;
  return runCoreGamectlCli(argv, io);
}

async function runSimulationCompareV4Cli(
  argv: readonly string[],
  io: GamectlIo,
): Promise<number | null> {
  const probePositionals = probeSimulationComparePositionals(argv);
  if (
    probePositionals === null ||
    probePositionals[0] !== "simulate" ||
    probePositionals[1] !== "compare"
  ) {
    return null;
  }

  const parsed = parseSimulationCompareArgs(argv);
  if (parsed === null) {
    return emitSimulationCompareFailure(
      argv.includes("--json"),
      io,
      "usage-error",
      "invalid simulate compare arguments",
      2,
    );
  }
  if (parsed.positionals.length !== 2) {
    return emitSimulationCompareFailure(
      parsed.values.json,
      io,
      "usage-error",
      "simulate compare takes no positional arguments",
      2,
    );
  }

  const values = parsed.values;
  if (values.base === undefined || values.candidate === undefined) return null;

  const repositoryRoot =
    values.root === undefined ? resolve(import.meta.dirname, "..") : resolve(values.root);
  const baseline = await loadSimulationReportValue(values.base, repositoryRoot);
  if (baseline.kind === "failure") {
    return emitSimulationCompareFailure(
      values.json,
      io,
      baseline.code,
      baseline.message,
      baseline.exitCode,
    );
  }
  const candidate = await loadSimulationReportValue(values.candidate, repositoryRoot);
  if (candidate.kind === "failure") {
    return emitSimulationCompareFailure(
      values.json,
      io,
      candidate.code,
      candidate.message,
      candidate.exitCode,
    );
  }

  const baselineIsV4 = isSimulationReportV4EnvelopeValue(baseline.value);
  const candidateIsV4 = isSimulationReportV4EnvelopeValue(candidate.value);
  if (!baselineIsV4 && !candidateIsV4) return null;
  if (baselineIsV4 !== candidateIsV4) {
    return emitSimulationCompareFailure(
      values.json,
      io,
      "compare-incompatible",
      "simulation reports use incompatible schema versions",
      3,
    );
  }

  if ((values.threshold?.length ?? 0) > 0) {
    return emitSimulationCompareFailure(
      values.json,
      io,
      "invalid-filter",
      "--threshold is supported only for legacy simulation-report-v1 comparison",
      2,
    );
  }

  const baselineReport = parseSimulationReportV4(baseline.value);
  if (baselineReport.kind !== "ok") {
    return emitSimulationCompareFailure(
      values.json,
      io,
      "report-invalid",
      `${values.base}: ${baselineReport.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
      2,
    );
  }
  const candidateReport = parseSimulationReportV4(candidate.value);
  if (candidateReport.kind !== "ok") {
    return emitSimulationCompareFailure(
      values.json,
      io,
      "report-invalid",
      `${values.candidate}: ${candidateReport.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
      2,
    );
  }

  const compared = diffSimulationReportsV1({
    baseline: baselineReport.report,
    candidate: candidateReport.report,
  });
  if (compared.kind === "failure") {
    const first = compared.diagnostics[0];
    const message = compared.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    if (first?.code === "DIFF_INCOMPATIBLE") {
      return emitSimulationCompareFailure(values.json, io, "compare-incompatible", message, 3);
    }
    if (first?.code === "DIFF_SCOPE_MISMATCH") {
      return emitSimulationCompareFailure(values.json, io, "compare-scope-mismatch", message, 2);
    }
    return emitSimulationCompareFailure(values.json, io, "report-invalid", message, 2);
  }

  if (!values.json) printSimulationDiffHuman(compared.diff, values.quiet, io);
  if (values.json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA_VERSION,
          command: "simulate.compare",
          ok: compared.diff.verdict !== "fail",
          result: compared.diff,
        },
        null,
        2,
      ),
    );
  }
  return compared.diff.verdict === "fail" ? 1 : 0;
}

function probeSimulationComparePositionals(argv: readonly string[]): string[] | null {
  try {
    return parseArgs({
      args: [...argv],
      options: {
        json: { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        root: { type: "string" },
        base: { type: "string" },
        candidate: { type: "string" },
        threshold: { type: "string", multiple: true },
      },
      allowPositionals: true,
      strict: false,
    }).positionals;
  } catch {
    return null;
  }
}

function parseSimulationCompareArgs(
  argv: readonly string[],
): Readonly<{ values: SimulationCompareValues; positionals: string[] }> | null {
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        json: { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        root: { type: "string" },
        base: { type: "string" },
        candidate: { type: "string" },
        threshold: { type: "string", multiple: true },
      },
      allowPositionals: true,
      strict: true,
    });
    return { values: parsed.values, positionals: parsed.positionals };
  } catch {
    return null;
  }
}

async function loadSimulationReportValue(
  path: string,
  repositoryRoot: string,
): Promise<LoadedSimulationReport> {
  const absolutePath = isAbsolute(path) ? path : resolve(repositoryRoot, path);
  try {
    const text = await readFile(absolutePath, "utf8");
    return { kind: "ok", value: unwrapSimulationReportEnvelope(parseJsonc(text)) };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (code === "ENOENT") {
      return {
        kind: "failure",
        code: "report-not-found",
        message: `simulation report not found: ${path}`,
        exitCode: 2,
      };
    }
    return {
      kind: "failure",
      code: "file-unreadable",
      message: `report cannot be read: ${error instanceof Error ? error.message : String(error)}`,
      exitCode: 4,
    };
  }
}

function unwrapSimulationReportEnvelope(value: unknown): unknown {
  if (!isPlainJsonObject(value)) return value;
  if (value.schemaVersion !== ENVELOPE_SCHEMA_VERSION || !("result" in value)) return value;
  const result = value.result;
  if (!isPlainJsonObject(result) || !("report" in result)) return value;
  return result.report;
}

function isSimulationReportV4EnvelopeValue(value: unknown): boolean {
  return isPlainJsonObject(value) && value.schemaVersion === SIMULATION_REPORT_SCHEMA_VERSION_V4;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printSimulationDiffHuman(diff: SimulationDiffV1, quiet: boolean, io: GamectlIo): void {
  if (quiet) {
    io.stdout(diff.verdict === "fail" ? "FAIL" : "OK");
    return;
  }
  io.stdout(`simulate compare: ${diff.verdict}`);
  io.stdout(
    `hard=${String(diff.hardInvariantChanges.length)} metrics=${String(diff.metricChanges.length)} distributions=${String(diff.distributionChanges.length)} fingerprints=${String(diff.fingerprintChanges.length)}`,
  );
}

function emitSimulationCompareFailure(
  json: boolean,
  io: GamectlIo,
  code: string,
  message: string,
  exitCode: number,
): number {
  io.stderr(`error: ${code}: ${message}`);
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA_VERSION,
          command: "simulate.compare",
          ok: false,
          error: { code, message },
        },
        null,
        2,
      ),
    );
  }
  return exitCode;
}

async function runCanonicalCorpusCli(
  argv: readonly string[],
  io: GamectlIo,
): Promise<number | null> {
  if (!hasCorpusFlag(argv)) return null;

  let values: CanonicalCorpusValues;
  let positionals: string[];
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        json: { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        root: { type: "string" },
        corpus: { type: "string" },
        seeds: { type: "string" },
        fixture: { type: "string" },
        policies: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (error) {
    return emitCorpusFailure(
      argv.includes("--json"),
      io,
      "invalid-filter",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (positionals.length !== 2 || positionals[0] !== "simulate" || positionals[1] !== "run") {
    return emitCorpusFailure(
      values.json,
      io,
      "invalid-filter",
      "--corpus is supported only by simulate run",
    );
  }

  const corpusId = values.corpus;
  if (corpusId !== JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1.corpusId) {
    return emitCorpusFailure(
      values.json,
      io,
      "invalid-filter",
      `unknown simulation corpus ${JSON.stringify(corpusId)}`,
    );
  }

  const overrideFlags = [
    values.seeds !== undefined ? "--seeds" : null,
    values.policies !== undefined ? "--policies" : null,
    values.fixture !== undefined ? "--fixture" : null,
  ].filter((value): value is string => value !== null);
  if (overrideFlags.length > 0) {
    return emitCorpusFailure(
      values.json,
      io,
      "invalid-filter",
      `canonical simulation corpus cannot be overridden by ${overrideFlags.join(", ")}`,
    );
  }

  const repositoryRoot =
    values.root === undefined ? resolve(import.meta.dirname, "..") : resolve(values.root);

  try {
    const contentRoot = resolve(repositoryRoot, "apps", "desktop", "public", "content");
    const runtime = createCompiledContentRuntime({
      canonicalize: canonicalizeAuthoritative,
      fingerprint,
    });
    const manifest = runtime.parseCompiledContentManifest(
      await readFile(resolve(contentRoot, "manifest.json"), "utf8"),
    );
    const chunkIds = runtime.selectJanuary1990ChunkIds(manifest);
    const chunks = await Promise.all(
      chunkIds.map(async (chunkId) =>
        runtime.parseCompiledContentChunk(
          await readFile(
            resolve(contentRoot, "chunks", ...chunkId.split("/")).concat(".json"),
            "utf8",
          ),
        ),
      ),
    );
    const registry = runtime.createContentRegistry(manifest, chunks, chunkIds);
    const contentContext = projectJanuary1990Content(registry);

    const balanceFiles = await loadBalanceSourceFiles({ repositoryRoot });
    const balanceCompilation = compileBalanceSet(balanceFiles);
    if (balanceCompilation.kind === "failure") {
      return emitCorpusFailure(
        values.json,
        io,
        "balance-invalid",
        `balance files are invalid: ${balanceCompilation.diagnostics.length} diagnostic(s)`,
        1,
      );
    }
    const slice = balanceCompilation.slices.find(
      (candidate) => candidate.sliceId === JANUARY_1990_BALANCE_SLICE_ID,
    );
    if (slice === undefined) {
      return emitCorpusFailure(
        values.json,
        io,
        "balance-invalid",
        `balance set has no ${JANUARY_1990_BALANCE_SLICE_ID} slice`,
        1,
      );
    }

    const { schemaVersion: _qualitySchema, sliceId: _qualitySlice, ...quality } = slice.quality;
    const {
      schemaVersion: _skillSchema,
      sliceId: _skillSlice,
      ...skillEvidence
    } = slice.skillEvidence;
    const balance = parseJanuary1990Balance({
      schemaVersion: "january-1990-balance-v1",
      sliceId: slice.sliceId,
      quality,
      skillEvidence,
    });

    const simulation = createJanuary1990SimulationV4({
      context: contentContext,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      scenarioIdentity: {
        scenarioId: JANUARY_1990_SCENARIO_ARTIFACT.program.scenarioId,
        programFingerprint: JANUARY_1990_SCENARIO_ARTIFACT.program.programFingerprint,
        certificateFingerprint: JANUARY_1990_SCENARIO_ARTIFACT.certificate.certificateFingerprint,
      },
    });
    const report = simulation.simulateCorpus(JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1);

    if (values.json) {
      io.stdout(
        JSON.stringify(
          {
            schemaVersion: ENVELOPE_SCHEMA_VERSION,
            command: "simulate.run",
            ok: true,
            result: { corpusId, report },
          },
          null,
          2,
        ),
      );
    } else if (values.quiet) {
      io.stdout(`simulate corpus ${corpusId}: ${String(report.runs)} runs`);
    } else {
      io.stdout(`simulate corpus ${corpusId}: ${String(report.runs)} runs`);
      io.stdout(
        `completed=${String(report.aggregates.completedRuns)} softLocks=${String(report.aggregates.softLocks)} terminalFailures=${String(report.aggregates.terminalFailures)}`,
      );
      io.stdout(`corpusFingerprint: ${report.corpus.fingerprint}`);
      io.stdout(`scenarioProgramFingerprint: ${report.scenario.programFingerprint}`);
      io.stdout(`scenarioCertificateFingerprint: ${report.scenario.certificateFingerprint}`);
    }

    if (report.invariantFailures.length > 0) return 1;
    return 0;
  } catch (error) {
    return emitCorpusFailure(
      values.json,
      io,
      "canonical-corpus-failed",
      error instanceof Error ? error.message : String(error),
      1,
    );
  }
}

function hasCorpusFlag(argv: readonly string[]): boolean {
  return argv.some((argument) => argument === "--corpus" || argument.startsWith("--corpus="));
}

function emitCorpusFailure(
  json: boolean,
  io: GamectlIo,
  code: string,
  message: string,
  exitCode = 2,
): number {
  io.stderr(`error: ${code}: ${message}`);
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA_VERSION,
          command: "simulate.run",
          ok: false,
          error: { code, message },
        },
        null,
        2,
      ),
    );
  }
  return exitCode;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await runGamectlCli(process.argv.slice(2), {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}
