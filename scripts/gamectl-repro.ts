import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { parseArgs } from "node:util";

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
  GAME_REPRO_SCHEMA_VERSION_V3,
  materializeJanuarySimulationFailureReproV3,
  parseGameReproV3,
  parseSimulationReportV4,
  replayJanuaryReproV3,
  SIMULATION_POLICY_IDS,
  type SimulationInvariantFailureV1,
  type SimulationPolicyIdV1,
  type SimulationTerminalStateV1,
} from "@runtime-human/game-simulation";

import type { GamectlIo } from "./gamectl-core";

const ENVELOPE_SCHEMA_VERSION = "runtime-human-gamectl-v1" as const;

type ReproValues = Readonly<{
  json: boolean;
  quiet: boolean;
  root?: string | undefined;
  report?: string | undefined;
  output?: string | undefined;
}>;

type ReplayValues = Readonly<{
  json: boolean;
  quiet: boolean;
  trace: boolean;
  root?: string | undefined;
}>;

export async function runSimulationReproV3Cli(
  argv: readonly string[],
  io: GamectlIo,
): Promise<number | null> {
  const probe = probePositionals(argv);
  if (probe === null || probe[0] !== "simulate" || probe[1] !== "repro") return null;

  const parsed = parseReproArgs(argv);
  if (parsed === null || parsed.positionals.length !== 2) {
    return emitFailure(
      "simulate.repro",
      argv.includes("--json"),
      io,
      "usage-error",
      "simulate repro expects --report <head.json> --output <failure.repro.json>",
      2,
    );
  }
  const reportPath = parsed.values.report;
  const outputPath = parsed.values.output;
  if (reportPath === undefined || outputPath === undefined) {
    return emitFailure(
      "simulate.repro",
      parsed.values.json,
      io,
      "usage-error",
      "simulate repro expects --report <head.json> --output <failure.repro.json>",
      2,
    );
  }

  const repositoryRoot = resolve(parsed.values.root ?? resolve(import.meta.dirname, ".."));
  const loadedReport = await readJsonValue(reportPath, repositoryRoot);
  if (loadedReport.kind === "failure") {
    return emitFailure(
      "simulate.repro",
      parsed.values.json,
      io,
      loadedReport.code,
      loadedReport.message,
      loadedReport.exitCode,
    );
  }
  const report = parseSimulationReportV4(unwrapSimulationReportEnvelope(loadedReport.value));
  if (report.kind !== "ok") {
    return emitFailure(
      "simulate.repro",
      parsed.values.json,
      io,
      "report-invalid",
      report.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
      2,
    );
  }

  const selected = selectFirstApplicableFailure(report.report.invariantFailures);
  if (selected === null) {
    return emitUnavailable(
      "simulate.repro",
      parsed.values.json,
      io,
      "candidate report has no replayable deterministic invariant failure",
    );
  }

  try {
    const runtime = await loadJanuaryRuntime(repositoryRoot);
    const run = runtime.simulation.runOnce({ seed: selected.seed, policyId: selected.policyId });
    if (run.terminalState !== selected.expectedTerminalState) {
      return emitUnavailable(
        "simulate.repro",
        parsed.values.json,
        io,
        `exact candidate run ended as ${run.terminalState} instead of ${selected.expectedTerminalState}`,
        selected.failure,
      );
    }

    const materialized = materializeJanuarySimulationFailureReproV3({
      fixtureId: report.report.scenario.scenarioId,
      run,
    });
    if (materialized.kind !== "materialized") {
      return emitUnavailable(
        "simulate.repro",
        parsed.values.json,
        io,
        materialized.message,
        selected.failure,
      );
    }

    const absoluteOutput = isAbsolute(outputPath)
      ? outputPath
      : resolve(repositoryRoot, outputPath);
    await writeFile(absoluteOutput, `${JSON.stringify(materialized.repro, null, 2)}\n`, "utf8");
    const result = Object.freeze({
      kind: "materialized" as const,
      invariantFailure: selected.failure,
      reproPath: outputPath,
      repro: materialized.repro,
    });
    emitSuccess("simulate.repro", parsed.values.json, parsed.values.quiet, io, result);
    return 0;
  } catch (error) {
    return emitFailure(
      "simulate.repro",
      parsed.values.json,
      io,
      "repro-materialization-failed",
      error instanceof Error ? error.message : String(error),
      1,
    );
  }
}

export async function runReplayV3Cli(
  argv: readonly string[],
  io: GamectlIo,
): Promise<number | null> {
  const probe = probePositionals(argv);
  if (probe === null || probe[0] !== "replay" || probe.length !== 2) return null;

  const parsed = parseReplayArgs(argv);
  if (parsed === null || parsed.positionals.length !== 2) return null;
  const reproPath = parsed.positionals[1];
  if (reproPath === undefined) return null;
  const repositoryRoot = resolve(parsed.values.root ?? resolve(import.meta.dirname, ".."));
  const loaded = await readJsonValue(reproPath, repositoryRoot);
  if (loaded.kind === "failure") return null;
  if (!isPlainRecord(loaded.value) || loaded.value.schemaVersion !== GAME_REPRO_SCHEMA_VERSION_V3) {
    return null;
  }

  const repro = parseGameReproV3(loaded.value);
  if (repro.kind !== "ok") {
    const result = Object.freeze({ kind: "invalid" as const, diagnostics: repro.diagnostics });
    emitSuccess("replay", parsed.values.json, parsed.values.quiet, io, result, false);
    return 2;
  }

  try {
    const runtime = await loadJanuaryRuntime(repositoryRoot);
    const result = replayJanuaryReproV3({
      context: runtime.context,
      balance: runtime.balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      repro: repro.repro,
      ...(parsed.values.trace ? { captureTrace: true } : {}),
    });
    const reproduced = result.kind === "reproduced";
    emitSuccess("replay", parsed.values.json, parsed.values.quiet, io, result, reproduced);
    if (reproduced) return 0;
    return result.kind === "incompatible" ? 3 : result.kind === "invalid" ? 2 : 1;
  } catch (error) {
    return emitFailure(
      "replay",
      parsed.values.json,
      io,
      "replay-failed",
      error instanceof Error ? error.message : String(error),
      1,
    );
  }
}

function selectFirstApplicableFailure(failures: readonly SimulationInvariantFailureV1[]): Readonly<{
  failure: SimulationInvariantFailureV1;
  seed: number;
  policyId: SimulationPolicyIdV1;
  expectedTerminalState: Exclude<SimulationTerminalStateV1, "completed">;
}> | null {
  for (const failure of failures) {
    const expectedTerminalState =
      failure.invariant === "no-soft-lock"
        ? "soft-lock"
        : failure.invariant === "terminal-validity"
          ? "protocol-rejected"
          : null;
    if (expectedTerminalState === null) continue;
    const policyId = SIMULATION_POLICY_IDS.find((candidate) => candidate === failure.policyId);
    const seed = Number(failure.seed);
    if (
      policyId === undefined ||
      !Number.isSafeInteger(seed) ||
      seed < 0 ||
      String(seed) !== failure.seed
    ) {
      continue;
    }
    return { failure, seed, policyId, expectedTerminalState };
  }
  return null;
}

async function loadJanuaryRuntime(repositoryRoot: string) {
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
  const context = projectJanuary1990Content(registry);

  const balanceFiles = await loadBalanceSourceFiles({ repositoryRoot });
  const balanceCompilation = compileBalanceSet(balanceFiles);
  if (balanceCompilation.kind === "failure") {
    throw new TypeError(
      `balance files are invalid: ${balanceCompilation.diagnostics.length} diagnostic(s)`,
    );
  }
  const slice = balanceCompilation.slices.find(
    (candidate) => candidate.sliceId === JANUARY_1990_BALANCE_SLICE_ID,
  );
  if (slice === undefined)
    throw new TypeError(`balance set has no ${JANUARY_1990_BALANCE_SLICE_ID} slice`);
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
    context,
    balance,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    scenarioIdentity: {
      scenarioId: JANUARY_1990_SCENARIO_ARTIFACT.program.scenarioId,
      programFingerprint: JANUARY_1990_SCENARIO_ARTIFACT.program.programFingerprint,
      certificateFingerprint: JANUARY_1990_SCENARIO_ARTIFACT.certificate.certificateFingerprint,
    },
  });
  return Object.freeze({ context, balance, simulation });
}

function probePositionals(argv: readonly string[]): string[] | null {
  try {
    return parseArgs({
      args: [...argv],
      options: {
        json: { type: "boolean" },
        quiet: { type: "boolean" },
        trace: { type: "boolean" },
        root: { type: "string" },
        report: { type: "string" },
        output: { type: "string" },
      },
      allowPositionals: true,
      strict: false,
    }).positionals;
  } catch {
    return null;
  }
}

function parseReproArgs(
  argv: readonly string[],
): Readonly<{ values: ReproValues; positionals: string[] }> | null {
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        json: { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        root: { type: "string" },
        report: { type: "string" },
        output: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
    return { values: parsed.values, positionals: parsed.positionals };
  } catch {
    return null;
  }
}

function parseReplayArgs(
  argv: readonly string[],
): Readonly<{ values: ReplayValues; positionals: string[] }> | null {
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        json: { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        trace: { type: "boolean", default: false },
        root: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
    return { values: parsed.values, positionals: parsed.positionals };
  } catch {
    return null;
  }
}

async function readJsonValue(
  path: string,
  repositoryRoot: string,
): Promise<
  | Readonly<{ kind: "ok"; value: unknown }>
  | Readonly<{
      kind: "failure";
      code: "report-not-found" | "file-unreadable";
      message: string;
      exitCode: 2 | 4;
    }>
> {
  const absolutePath = isAbsolute(path) ? path : resolve(repositoryRoot, path);
  try {
    return { kind: "ok", value: parseJsonc(await readFile(absolutePath, "utf8")) };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (code === "ENOENT") {
      return {
        kind: "failure",
        code: "report-not-found",
        message: `file not found: ${path}`,
        exitCode: 2,
      };
    }
    return {
      kind: "failure",
      code: "file-unreadable",
      message: `file cannot be read: ${error instanceof Error ? error.message : String(error)}`,
      exitCode: 4,
    };
  }
}

function unwrapSimulationReportEnvelope(value: unknown): unknown {
  if (!isPlainRecord(value) || value.schemaVersion !== ENVELOPE_SCHEMA_VERSION) return value;
  const result = value.result;
  return isPlainRecord(result) && "report" in result ? result.report : value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emitSuccess(
  command: "simulate.repro" | "replay",
  json: boolean,
  quiet: boolean,
  io: GamectlIo,
  result: unknown,
  ok = true,
): void {
  if (json) {
    io.stdout(
      JSON.stringify({ schemaVersion: ENVELOPE_SCHEMA_VERSION, command, ok, result }, null, 2),
    );
    return;
  }
  if (quiet) {
    io.stdout(ok ? "OK" : "FAIL");
    return;
  }
  const kind = isPlainRecord(result) && typeof result.kind === "string" ? result.kind : "ok";
  io.stdout(`${command}: ${kind}`);
}

function emitUnavailable(
  command: "simulate.repro",
  json: boolean,
  io: GamectlIo,
  message: string,
  invariantFailure?: SimulationInvariantFailureV1,
): number {
  io.stderr(`error: repro-unavailable: ${message}`);
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA_VERSION,
          command,
          ok: false,
          result: {
            kind: "unavailable",
            message,
            ...(invariantFailure === undefined ? {} : { invariantFailure }),
          },
        },
        null,
        2,
      ),
    );
  }
  return 1;
}

function emitFailure(
  command: "simulate.repro" | "replay",
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
          command,
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
