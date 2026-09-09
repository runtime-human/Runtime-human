import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

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
  JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1,
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

export async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const corpusExit = await runCanonicalCorpusCli(argv, io);
  if (corpusExit !== null) return corpusExit;

  const scenarioExit = await runScenarioGamectlCli(argv, io);
  if (scenarioExit !== null) return scenarioExit;
  return runCoreGamectlCli(argv, io);
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
