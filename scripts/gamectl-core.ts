import { stat, readdir, readFile } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { parse as parseJsonc } from "jsonc-parser";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import { compileBalanceSet, loadBalanceSourceFiles } from "@runtime-human/game-content-compiler";
import { createCompiledContentRuntime } from "@runtime-human/game-content";
import {
  canonicalizeAuthoritative,
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprint,
  fingerprint,
  JANUARY_1990_BALANCE_SLICE_ID,
  parseJanuary1990Balance,
  type January1990MonthPlanV1,
  type MonthRunStep,
} from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";
import {
  compareSimulationReportsV1,
  createJanuary1990AnswerProviders,
  createJanuary1990Simulation,
  deriveJanuaryOutcomeRollV1,
  explainJanuaryQualityV1,
  parseGameReproV1,
  parseGameplayFixtureV1,
  parseSimulationReportV1,
  replayJanuaryReproV1,
  runJanuaryCommandSequence,
  SIMULATION_COMPARE_METRIC_IDS,
  SIMULATION_POLICY_IDS,
  type GameReplayTraceV1,
  type GameplayFixtureV1,
  type JanuaryQualityExplanationV1,
  type SimulationCompareMetricIdV1,
  type SimulationCompareReportV1,
  type SimulationCompareResultV1,
  type SimulationPolicyIdV1,
  type SimulationReportV1,
} from "@runtime-human/game-simulation";
import {
  catalogImpact,
  catalogReferences,
  getCatalogEntry,
  listCatalogEntries,
  loadContentCatalog,
  loadZoneDefinitions,
  runDoctor,
  type CatalogEntryFilterV1,
  type CatalogImpactV1,
  type CatalogReferencesV1,
  type ContentCatalogEntryV1,
  type DoctorReportV1,
  type StructuredDiagnosticV1,
} from "@runtime-human/game-devtools";

export type GamectlIo = Readonly<{
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}>;

const ENVELOPE_SCHEMA_VERSION = "runtime-human-gamectl-v1" as const;

const ENTRY_KINDS = ["event", "reference", "storylet", "technology"] as const;
type EntryKind = (typeof ENTRY_KINDS)[number];

type CommandName =
  | "doctor"
  | "catalog.list"
  | "catalog.show"
  | "catalog.refs"
  | "catalog.impact"
  | "content.validate"
  | "content.source"
  | "simulate.run"
  | "simulate.compare"
  | "fixture.list"
  | "fixture.materialize"
  | "replay"
  | "explain";

type CommandRequest =
  | Readonly<{ kind: "doctor" }>
  | Readonly<{ kind: "catalog.list" }>
  | Readonly<{ kind: "catalog.show"; id: string }>
  | Readonly<{ kind: "catalog.refs"; id: string }>
  | Readonly<{ kind: "catalog.impact"; id: string }>
  | Readonly<{ kind: "content.validate" }>
  | Readonly<{ kind: "content.source"; id: string }>
  | Readonly<{ kind: "simulate.run" }>
  | Readonly<{ kind: "simulate.compare" }>
  | Readonly<{ kind: "fixture.list" }>
  | Readonly<{ kind: "fixture.materialize"; id: string }>
  | Readonly<{ kind: "replay"; path: string }>
  | Readonly<{ kind: "explain" }>;

type CommandFailure = Readonly<{
  code: string;
  message: string;
  diagnostics?: readonly StructuredDiagnosticV1[];
}>;

type HandlerPayload = Readonly<{ ok: boolean; result?: unknown; error?: CommandFailure }>;

type HandlerOutput = Readonly<{ exitCode: number; payload: HandlerPayload }>;

type Route =
  | Readonly<{ request: CommandRequest }>
  | Readonly<{
      command: CommandName | "unknown";
      errorCode: "unknown-command" | "usage-error";
      message: string;
    }>;

type CliContext = Readonly<{ repositoryRoot: string; json: boolean; quiet: boolean }>;

type ProjectedEntry = Readonly<{
  id: string;
  kind: ContentCatalogEntryV1["kind"];
  era: string;
  domain: string;
  entryPoint: boolean;
  sourcePath: string;
}>;

const USAGE = [
  "Usage: gamectl [options] <command>",
  "",
  "Commands:",
  "  doctor                                          environment and content checks",
  "  catalog list [--kind <kind>] [--domain <domain>] [--era <era>]",
  "  catalog show <id>",
  "  catalog refs <id>",
  "  catalog impact <id>",
  "  content validate",
  "  content source <id>",
  "  simulate run [--seeds <start>..<end>] [--fixture <id>] [--policies <id,id>|all]",
  "  simulate compare --base <report.json> --candidate <report.json> [--threshold <metric>=<n>]...",
  "  fixture list",
  "  fixture materialize <id> [--policy <id>|all]",
  "  replay <path/to/*.repro.json> [--trace]",
  "  explain (--repro <file> | --outcome january-1990 --access <route> --learning <practice> --response <response> --roll <n>)",
  "",
  "Options:",
  "  --json            emit the runtime-human-gamectl-v1 JSON envelope on stdout",
  "  --quiet           minimal human output",
  "  --root <path>     repository root (default: the repository containing gamectl)",
  "",
  `Kinds: ${ENTRY_KINDS.join(", ")}`,
].join("\n");

function parseCliArgs(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    options: {
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
      root: { type: "string" },
      kind: { type: "string" },
      domain: { type: "string" },
      era: { type: "string" },
      seeds: { type: "string" },
      fixture: { type: "string" },
      policies: { type: "string" },
      base: { type: "string" },
      candidate: { type: "string" },
      threshold: { type: "string", multiple: true },
      trace: { type: "boolean", default: false },
      repro: { type: "string" },
      outcome: { type: "string" },
      access: { type: "string" },
      learning: { type: "string" },
      response: { type: "string" },
      roll: { type: "string" },
      policy: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });
}

type CliValues = ReturnType<typeof parseCliArgs>["values"];

export async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  let values: CliValues;
  let positionals: string[];
  try {
    const parsed = parseCliArgs(argv);
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`error: usage-error: ${message}`);
    io.stderr(USAGE);
    if (argv.includes("--json")) {
      io.stdout(
        JSON.stringify(
          {
            schemaVersion: ENVELOPE_SCHEMA_VERSION,
            command: "unknown",
            ok: false,
            error: { code: "usage-error", message },
          },
          null,
          2,
        ),
      );
    }
    return 2;
  }

  const context: CliContext = {
    repositoryRoot:
      values.root === undefined ? resolve(import.meta.dirname, "..") : resolve(values.root),
    json: values.json,
    quiet: values.quiet,
  };

  const route = routeCommand(positionals);
  if (!("request" in route)) {
    io.stderr(`error: ${route.errorCode}: ${route.message}`);
    io.stderr(USAGE);
    if (context.json) {
      io.stdout(
        JSON.stringify(
          {
            schemaVersion: ENVELOPE_SCHEMA_VERSION,
            command: route.command,
            ok: false,
            error: { code: route.errorCode, message: route.message },
          },
          null,
          2,
        ),
      );
    }
    return 2;
  }

  const rootFailure = await validateRepositoryRoot(values.root, context.repositoryRoot);
  if (rootFailure !== null) {
    io.stderr(`error: ${rootFailure.error.code}: ${rootFailure.error.message}`);
    io.stderr(USAGE);
    if (context.json) {
      io.stdout(
        JSON.stringify(
          formatEnvelope(route.request.kind, { ok: false, error: rootFailure.error }),
          null,
          2,
        ),
      );
    }
    return rootFailure.exitCode;
  }

  try {
    const output = await execute(route.request, context, values, io);
    if (context.json) {
      io.stdout(JSON.stringify(formatEnvelope(route.request.kind, output.payload), null, 2));
    } else if (!output.payload.ok) {
      printFailureHuman(output.payload.error, io);
    }
    return output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload: HandlerPayload = { ok: false, error: { code: "internal-error", message } };
    if (context.json) {
      io.stdout(JSON.stringify(formatEnvelope(route.request.kind, payload), null, 2));
    } else {
      io.stderr(`error: internal-error: ${message}`);
    }
    return 5;
  }
}

function formatEnvelope(command: CommandName, payload: HandlerPayload): Record<string, unknown> {
  return {
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    command,
    ok: payload.ok,
    ...(payload.result !== undefined ? { result: payload.result } : {}),
    ...(payload.error !== undefined ? { error: payload.error } : {}),
  };
}

function routeCommand(positionals: readonly string[]): Route {
  const primary = positionals[0];
  const secondary = positionals[1];
  const tertiary = positionals[2];
  if (primary === undefined) {
    return { command: "unknown", errorCode: "unknown-command", message: "missing command" };
  }
  if (primary === "doctor") {
    if (secondary !== undefined) {
      return {
        command: "doctor",
        errorCode: "usage-error",
        message: "doctor takes no positional arguments",
      };
    }
    return { request: { kind: "doctor" } };
  }
  if (primary === "catalog") {
    switch (secondary) {
      case "list":
        if (tertiary !== undefined) {
          return {
            command: "catalog.list",
            errorCode: "usage-error",
            message: "catalog list takes no positional arguments",
          };
        }
        return { request: { kind: "catalog.list" } };
      case "show":
      case "refs":
      case "impact": {
        const name: CommandName =
          secondary === "show"
            ? "catalog.show"
            : secondary === "refs"
              ? "catalog.refs"
              : "catalog.impact";
        if (tertiary === undefined || positionals.length > 3) {
          return {
            command: name,
            errorCode: "usage-error",
            message: `catalog ${secondary} expects exactly one <id>`,
          };
        }
        return { request: { kind: name, id: tertiary } };
      }
      default:
        return {
          command: "unknown",
          errorCode: "unknown-command",
          message:
            secondary === undefined
              ? "missing catalog subcommand"
              : `unknown catalog subcommand ${JSON.stringify(secondary)}`,
        };
    }
  }
  if (primary === "content") {
    if (secondary === "validate") {
      if (tertiary !== undefined) {
        return {
          command: "content.validate",
          errorCode: "usage-error",
          message: "content validate takes no positional arguments",
        };
      }
      return { request: { kind: "content.validate" } };
    }
    if (secondary === "source") {
      if (tertiary === undefined || positionals.length > 3) {
        return {
          command: "content.source",
          errorCode: "usage-error",
          message: "content source expects exactly one <id>",
        };
      }
      return { request: { kind: "content.source", id: tertiary } };
    }
    return {
      command: "unknown",
      errorCode: "unknown-command",
      message:
        secondary === undefined
          ? "missing content subcommand"
          : `unknown content subcommand ${JSON.stringify(secondary)}`,
    };
  }
  if (primary === "simulate") {
    if (secondary === "run") {
      if (tertiary !== undefined) {
        return {
          command: "simulate.run",
          errorCode: "usage-error",
          message: "simulate run takes no positional arguments",
        };
      }
      return { request: { kind: "simulate.run" } };
    }
    if (secondary === "compare") {
      if (tertiary !== undefined) {
        return {
          command: "simulate.compare",
          errorCode: "usage-error",
          message: "simulate compare takes no positional arguments",
        };
      }
      return { request: { kind: "simulate.compare" } };
    }
    return {
      command: "unknown",
      errorCode: "unknown-command",
      message:
        secondary === undefined
          ? "missing simulate subcommand"
          : `unknown simulate subcommand ${JSON.stringify(secondary)}`,
    };
  }
  if (primary === "fixture") {
    if (secondary === "list") {
      if (tertiary !== undefined) {
        return {
          command: "fixture.list",
          errorCode: "usage-error",
          message: "fixture list takes no positional arguments",
        };
      }
      return { request: { kind: "fixture.list" } };
    }
    if (secondary === "materialize") {
      if (tertiary === undefined || positionals.length > 3) {
        return {
          command: "fixture.materialize",
          errorCode: "usage-error",
          message: "fixture materialize expects exactly one <id>",
        };
      }
      return { request: { kind: "fixture.materialize", id: tertiary } };
    }
    return {
      command: "unknown",
      errorCode: "unknown-command",
      message:
        secondary === undefined
          ? "missing fixture subcommand"
          : `unknown fixture subcommand ${JSON.stringify(secondary)}`,
    };
  }
  if (primary === "replay") {
    if (secondary === undefined || positionals.length > 2) {
      return {
        command: "replay",
        errorCode: "usage-error",
        message: "replay expects exactly one <path>",
      };
    }
    return { request: { kind: "replay", path: secondary } };
  }
  if (primary === "explain") {
    if (secondary !== undefined) {
      return {
        command: "explain",
        errorCode: "usage-error",
        message: "explain takes no positional arguments",
      };
    }
    return { request: { kind: "explain" } };
  }
  return {
    command: "unknown",
    errorCode: "unknown-command",
    message: `unknown command ${JSON.stringify(primary)}`,
  };
}

async function execute(
  command: CommandRequest,
  context: CliContext,
  values: CliValues,
  io: GamectlIo,
): Promise<HandlerOutput> {
  switch (command.kind) {
    case "doctor":
      return runDoctorCommand(context, io);
    case "catalog.list":
      return runCatalogList(context, values, io);
    case "catalog.show":
      return runCatalogShow(command.id, context, io);
    case "catalog.refs":
      return runCatalogRefs(command.id, context, io);
    case "catalog.impact":
      return runCatalogImpact(command.id, context, io);
    case "content.validate":
      return runContentValidate(context, io);
    case "content.source":
      return runContentSource(command.id, context, io);
    case "simulate.run":
      return runSimulateRun(
        {
          seeds: values.seeds,
          fixture: values.fixture,
          policies: values.policies,
        },
        context,
        io,
      );
    case "simulate.compare":
      return runSimulateCompare(
        {
          base: values.base,
          candidate: values.candidate,
          thresholds: values.threshold,
        },
        context,
        io,
      );
    case "fixture.list":
      return runFixtureList(context, io);
    case "fixture.materialize":
      return runFixtureMaterialize({ id: command.id, policy: values.policy }, context, io);
    case "replay":
      return runReplay(command.path, values.trace === true, context, io);
    case "explain":
      return runExplain(
        {
          repro: values.repro,
          outcome: values.outcome,
          access: values.access,
          learning: values.learning,
          response: values.response,
          roll: values.roll,
        },
        context,
        io,
      );
  }
}

async function runDoctorCommand(context: CliContext, io: GamectlIo): Promise<HandlerOutput> {
  const report = await runDoctor({ repositoryRoot: context.repositoryRoot });
  if (!context.json) printDoctorHuman(report, context.quiet, io);
  const environmentFailed = report.checks.some(
    (check) => !check.ok && check.severity === "environment",
  );
  const contentFailed = report.checks.some((check) => !check.ok && check.severity === "content");
  return {
    exitCode: environmentFailed ? 4 : contentFailed ? 1 : 0,
    payload: { ok: report.ok, result: report },
  };
}

async function runCatalogList(
  context: CliContext,
  values: CliValues,
  io: GamectlIo,
): Promise<HandlerOutput> {
  if (values.kind !== undefined && !isEntryKind(values.kind)) {
    return failureOutput(
      2,
      "invalid-kind",
      `unknown entry kind ${JSON.stringify(values.kind)}; expected one of ${ENTRY_KINDS.join(", ")}`,
    );
  }
  if (values.domain !== undefined && values.domain.length === 0) {
    return failureOutput(2, "invalid-filter", "--domain must be a non-empty string");
  }
  if (values.era !== undefined && values.era.length === 0) {
    return failureOutput(2, "invalid-filter", "--era must be a non-empty string");
  }
  const loaded = await loadContentCatalog({ repositoryRoot: context.repositoryRoot });
  if (loaded.kind === "failure") return contentFailure(loaded.diagnostics);
  const filter: CatalogEntryFilterV1 = {
    ...(values.kind !== undefined ? { kind: values.kind } : {}),
    ...(values.domain !== undefined ? { domain: values.domain } : {}),
    ...(values.era !== undefined ? { era: values.era } : {}),
  };
  const entries = listCatalogEntries(loaded.catalog, filter).map(projectEntry);
  if (!context.json) printCatalogListHuman(entries, context.quiet, io);
  return successOutput({ count: entries.length, entries });
}

async function runCatalogShow(
  id: string,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const loaded = await loadContentCatalog({ repositoryRoot: context.repositoryRoot });
  if (loaded.kind === "failure") return contentFailure(loaded.diagnostics);
  const entry = getCatalogEntry(loaded.catalog, id);
  if (entry === undefined) return unknownEntity(id);
  if (!context.json) printEntryHuman(entry, io);
  return successOutput({ entry });
}

async function runCatalogRefs(
  id: string,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const loaded = await loadContentCatalog({ repositoryRoot: context.repositoryRoot });
  if (loaded.kind === "failure") return contentFailure(loaded.diagnostics);
  const references = catalogReferences(loaded.catalog, id);
  if (references === undefined) return unknownEntity(id);
  if (!context.json) printReferencesHuman(references, io);
  return successOutput({
    id: references.id,
    outgoing: references.outgoing,
    incoming: references.incoming,
  });
}

async function runCatalogImpact(
  id: string,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const loaded = await loadContentCatalog({ repositoryRoot: context.repositoryRoot });
  if (loaded.kind === "failure") return contentFailure(loaded.diagnostics);
  let impact: CatalogImpactV1 | undefined;
  try {
    const zones = await loadZoneDefinitions(context.repositoryRoot);
    impact = await catalogImpact(loaded.catalog, id, {
      testsRoot: resolve(context.repositoryRoot, "tests"),
      ...(zones === undefined ? {} : { zones }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return failureOutput(1, "zones-invalid", `.studio/zones.json is invalid: ${error.message}`);
    }
    throw error;
  }
  if (impact === undefined) return unknownEntity(id);
  if (!context.json) printImpactHuman(impact, io);
  return successOutput({
    id: impact.id,
    sourcePath: impact.sourcePath,
    consumers: impact.consumers,
    tests: impact.tests,
    zones: impact.zones,
  });
}

async function runContentValidate(context: CliContext, io: GamectlIo): Promise<HandlerOutput> {
  const loaded = await loadContentCatalog({ repositoryRoot: context.repositoryRoot });
  if (loaded.kind === "failure") return contentFailure(loaded.diagnostics);
  const entryCount = loaded.catalog.entries.length;
  if (!context.json) {
    io.stdout(context.quiet ? "OK" : `content OK (${String(entryCount)} entries)`);
  }
  return successOutput({ entryCount, diagnostics: [] });
}

async function runContentSource(
  id: string,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const loaded = await loadContentCatalog({ repositoryRoot: context.repositoryRoot });
  if (loaded.kind === "failure") return contentFailure(loaded.diagnostics);
  const entry = getCatalogEntry(loaded.catalog, id);
  if (entry === undefined) return unknownEntity(id);
  if (!context.json) io.stdout(`${entry.id} -> ${entry.sourcePath}`);
  return successOutput({ id: entry.id, path: entry.sourcePath });
}

function successOutput(result: unknown): HandlerOutput {
  return { exitCode: 0, payload: { ok: true, result } };
}

type JanuaryHarness = Readonly<{
  simulation: ReturnType<typeof createJanuary1990Simulation>;
  context: ReturnType<typeof projectJanuary1990Content>;
  balance: ReturnType<typeof parseJanuary1990Balance>;
  steps: readonly MonthRunStep[];
  plan: January1990MonthPlanV1;
  rulesetFingerprint: Fingerprint;
}>;

async function loadJanuarySimulationHarness(
  context: CliContext,
): Promise<
  | Readonly<{ kind: "ok"; harness: JanuaryHarness }>
  | Readonly<{ kind: "failure"; output: HandlerOutput }>
> {
  try {
    const contentRoot = resolve(context.repositoryRoot, "apps", "desktop", "public", "content");
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

    const balanceFiles = await loadBalanceSourceFiles({ repositoryRoot: context.repositoryRoot });
    const balanceCompilation = compileBalanceSet(balanceFiles);
    if (balanceCompilation.kind === "failure") {
      return {
        kind: "failure",
        output: failureOutput(
          1,
          "balance-invalid",
          `balance files are invalid: ${balanceCompilation.diagnostics.length} diagnostic(s)`,
        ),
      };
    }
    const slice = balanceCompilation.slices.find(
      (candidate) => candidate.sliceId === JANUARY_1990_BALANCE_SLICE_ID,
    );
    if (slice === undefined) {
      return {
        kind: "failure",
        output: failureOutput(
          1,
          "balance-invalid",
          `balance set has no ${JANUARY_1990_BALANCE_SLICE_ID} slice`,
        ),
      };
    }
    const { schemaVersion: _q, sliceId: _qs, ...quality } = slice.quality;
    const { schemaVersion: _s, sliceId: _ss, ...skillEvidence } = slice.skillEvidence;
    const balance = parseJanuary1990Balance({
      schemaVersion: "january-1990-balance-v1",
      sliceId: slice.sliceId,
      quality,
      skillEvidence,
    });

    const simulation = createJanuary1990Simulation({
      context: contentContext,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    });
    return {
      kind: "ok",
      harness: {
        simulation,
        context: contentContext,
        balance,
        steps: createJanuary1990MonthSteps(contentContext, balance),
        plan: createJanuary1990MonthPlan(contentContext),
        rulesetFingerprint: createJanuary1990RulesFingerprint(balance),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: "failure",
      output: failureOutput(4, "simulation-environment-unavailable", message),
    };
  }
}

async function runSimulateRun(
  options: Readonly<{
    seeds?: string | undefined;
    fixture?: string | undefined;
    policies?: string | undefined;
  }>,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const loaded = await loadJanuarySimulationHarness(context);
  if (loaded.kind === "failure") return loaded.output;
  const harness = loaded.harness;

  let seedStart: number;
  let seedEnd: number;
  let fixtureId: string | null = null;
  if (options.fixture !== undefined) {
    if (options.seeds !== undefined) {
      return failureOutput(2, "usage-error", "--seeds and --fixture are mutually exclusive");
    }
    const fixture = await loadGameplayFixtureV1(options.fixture, context);
    if (fixture.kind === "failure") {
      const code = fixture.output.payload.error?.code;
      if (code === "fixture-not-found") {
        return failureOutput(
          2,
          "unknown-entity",
          `unknown gameplay fixture ${JSON.stringify(options.fixture)}`,
        );
      }
      return fixture.output;
    }
    seedStart = fixture.fixture.seed;
    seedEnd = fixture.fixture.seed;
    fixtureId = fixture.fixture.id;
  } else {
    const seeds = options.seeds === undefined ? "1..16" : options.seeds;
    const parsed = parseSeedRange(seeds);
    if (parsed === null) {
      return failureOutput(
        2,
        "invalid-filter",
        `--seeds must look like <start>..<end>, got ${JSON.stringify(seeds)}`,
      );
    }
    seedStart = parsed.start;
    seedEnd = parsed.end;
  }

  const policies = resolvePolicies(options.policies);
  if (policies === null) {
    return failureOutput(
      2,
      "invalid-filter",
      `--policies must be 'all' or a comma list of ${SIMULATION_POLICY_IDS.join(", ")}`,
    );
  }

  const report = harness.simulation.simulate({ seedStart, seedEnd, policies });
  if (!context.json) printSimulationReportHuman(report, fixtureId, context.quiet, io);
  return successOutput({
    ...(fixtureId !== null ? { fixtureId } : {}),
    report,
  });
}

function parseSeedRange(value: string): Readonly<{ start: number; end: number }> | null {
  const match = /^(0|[1-9][0-9]*)\.\.(0|[1-9][0-9]*)$/u.exec(value);
  if (match === null) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start || end - start + 1 > 10_000) return null;
  return { start, end };
}

function resolvePolicies(raw: string | undefined): readonly SimulationPolicyIdV1[] | null {
  if (raw === undefined || raw === "all") return [...SIMULATION_POLICY_IDS];
  const requested = raw.split(",").map((entry) => entry.trim());
  const policies: SimulationPolicyIdV1[] = [];
  for (const candidate of requested) {
    if (!SIMULATION_POLICY_IDS.some((policy) => policy === candidate)) return null;
    policies.push(candidate as SimulationPolicyIdV1);
  }
  return policies.length === 0 ? null : policies;
}

function printSimulationReportHuman(
  report: SimulationReportV1,
  fixtureId: string | null,
  quiet: boolean,
  io: GamectlIo,
): void {
  if (quiet) {
    io.stdout(report.aggregates.completedRuns === report.runs ? "OK" : "FAIL");
    return;
  }
  const scope =
    fixtureId === null
      ? `seeds ${report.seedRange.start}..${report.seedRange.end}`
      : `fixture ${fixtureId}`;
  io.stdout(`simulate ${scope}: ${String(report.runs)} runs`);
  io.stdout(
    `completed=${String(report.aggregates.completedRuns)} softLocks=${String(report.aggregates.softLocks)} terminalFailures=${String(report.aggregates.terminalFailures)}`,
  );
  io.stdout(`rulesetFingerprint: ${report.rulesetFingerprint}`);
  if (report.invariantFailures.length > 0) {
    for (const failure of report.invariantFailures) {
      io.stdout(
        `FAIL ${failure.invariant} seed=${failure.seed} policy=${failure.policyId}: ${failure.detail}`,
      );
    }
  }
}

async function runReplay(
  path: string,
  captureTrace: boolean,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const absolutePath = isAbsolute(path) ? path : resolve(context.repositoryRoot, path);
  const file = await readRepositoryFile(absolutePath);
  if (file.kind === "not-found") {
    return failureOutput(2, "repro-not-found", `repro file not found: ${path}`);
  }
  if (file.kind === "unreadable") {
    return failureOutput(4, "file-unreadable", `repro file cannot be read: ${file.message}`);
  }
  const parsed = parseGameReproV1(parseJsonc(file.text));
  if (parsed.kind === "invalid") {
    const message = parsed.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    for (const diagnostic of parsed.diagnostics) {
      io.stderr(`error: ${diagnostic.code}: ${diagnostic.message}`);
    }
    return { exitCode: 2, payload: { ok: false, error: { code: "repro-invalid", message } } };
  }

  const loaded = await loadJanuarySimulationHarness(context);
  if (loaded.kind === "failure") return loaded.output;
  const harness = loaded.harness;

  const result = replayJanuaryReproV1({
    context: harness.context,
    balance: harness.balance,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    repro: parsed.repro,
    ...(captureTrace ? { captureTrace: true } : {}),
  });

  if (result.kind === "reproduced") {
    if (!context.json) {
      io.stdout(context.quiet ? "OK" : `reproduced: ${result.terminalCheckpointHash}`);
      printReplayTraceHuman(result.trace, io);
    }
    return successOutput({
      kind: "reproduced",
      terminalCheckpointHash: result.terminalCheckpointHash,
      ...(result.trace !== undefined ? { trace: result.trace } : {}),
    });
  }
  const exitCode = result.kind === "not-reproduced" ? 1 : result.kind === "incompatible" ? 3 : 2;
  const code =
    result.kind === "not-reproduced"
      ? "repro-not-reproduced"
      : result.kind === "incompatible"
        ? "repro-incompatible"
        : "repro-invalid";
  const message = result.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
  if (!context.json) {
    for (const diagnostic of result.diagnostics) {
      io.stderr(`error: ${diagnostic.code}: ${diagnostic.message}`);
    }
    if (result.kind === "not-reproduced") printReplayTraceHuman(result.trace, io);
  }
  return failureOutput(exitCode, code, message);
}

function printReplayTraceHuman(trace: GameReplayTraceV1 | undefined, io: GamectlIo): void {
  if (trace === undefined) return;
  io.stdout(`trace ${trace.schemaVersion}: terminal=${trace.terminalState}`);
  for (const decision of trace.decisions) {
    io.stdout(
      `  decision[${String(decision.index)}] ${decision.decisionId} -> ${formatAnswerValue(decision.answer)}`,
    );
  }
  const scores = trace.materializedQualityScores;
  io.stdout(
    scores === null
      ? "  materialized scores: (not completed)"
      : `  materialized scores: clarity=${String(scores.clarity)} correctness=${String(scores.correctness)} reliability=${String(scores.reliability)}`,
  );
}

function formatAnswerValue(answer: unknown): string {
  if (typeof answer !== "object" || answer === null) return JSON.stringify(answer);
  const record = answer as Record<string, unknown>;
  if (typeof record.route === "string") return record.route;
  if (typeof record.practice === "string") return record.practice;
  if (typeof record.response === "string") return record.response;
  return JSON.stringify(answer);
}

async function runSimulateCompare(
  options: Readonly<{
    base?: string | undefined;
    candidate?: string | undefined;
    thresholds?: readonly string[] | undefined;
  }>,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  if (options.base === undefined || options.candidate === undefined) {
    return failureOutput(
      2,
      "usage-error",
      "simulate compare requires --base <report.json> and --candidate <report.json>",
    );
  }
  const thresholds: Partial<Record<SimulationCompareMetricIdV1, number>> = {};
  for (const raw of options.thresholds ?? []) {
    const match = /^([a-zA-Z]+[a-zA-Z0-9]*)=(0|[1-9][0-9]*)$/u.exec(raw);
    const metricId = match?.[1];
    if (match === null || metricId === undefined || !isCompareMetricId(metricId)) {
      return failureOutput(
        2,
        "invalid-filter",
        `--threshold must look like <metric>=<n> with metric in ${SIMULATION_COMPARE_METRIC_IDS.join(", ")}, got ${JSON.stringify(raw)}`,
      );
    }
    if (metricId in thresholds) {
      return failureOutput(
        2,
        "invalid-filter",
        `--threshold for ${metricId} is given more than once`,
      );
    }
    thresholds[metricId] = Number(match[2]);
  }

  const baseline = await loadSimulationReport(options.base, context);
  if (baseline.kind === "failure") return baseline.output;
  const candidate = await loadSimulationReport(options.candidate, context);
  if (candidate.kind === "failure") return candidate.output;

  const compared: SimulationCompareResultV1 = compareSimulationReportsV1({
    baseline: baseline.report,
    candidate: candidate.report,
    thresholds,
  });
  if (compared.kind === "failure") {
    const first = compared.diagnostics[0];
    const message = compared.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    if (!context.json) {
      for (const diagnostic of compared.diagnostics) {
        io.stderr(`error: ${diagnostic.code}: ${diagnostic.message}`);
      }
    }
    const exitCode = first?.code === "COMPARE_INCOMPATIBLE" ? 3 : 2;
    const code =
      first?.code === "COMPARE_INCOMPATIBLE"
        ? "compare-incompatible"
        : first?.code === "COMPARE_SCOPE_MISMATCH"
          ? "compare-scope-mismatch"
          : "compare-threshold-invalid";
    return failureOutput(exitCode, code, message);
  }

  const report = compared.report;
  if (!context.json) printCompareHuman(report, options.base, options.candidate, context.quiet, io);
  return {
    exitCode: report.regressionCount > 0 ? 1 : 0,
    payload: {
      ok: report.regressionCount === 0,
      result: report satisfies SimulationCompareReportV1,
    },
  };
}

function isCompareMetricId(value: string): value is SimulationCompareMetricIdV1 {
  return SIMULATION_COMPARE_METRIC_IDS.some((metric) => metric === value);
}

async function loadSimulationReport(
  path: string,
  context: CliContext,
): Promise<
  | Readonly<{ kind: "ok"; report: SimulationReportV1 }>
  | Readonly<{ kind: "failure"; output: HandlerOutput }>
> {
  const absolutePath = isAbsolute(path) ? path : resolve(context.repositoryRoot, path);
  const file = await readRepositoryFile(absolutePath);
  if (file.kind === "not-found") {
    return {
      kind: "failure",
      output: failureOutput(2, "report-not-found", `simulation report not found: ${path}`),
    };
  }
  if (file.kind === "unreadable") {
    return {
      kind: "failure",
      output: failureOutput(4, "file-unreadable", `report cannot be read: ${file.message}`),
    };
  }
  const parsed = parseSimulationReportV1(unwrapSimulationReportEnvelope(parseJsonc(file.text)));
  if (parsed.kind === "invalid") {
    const message = parsed.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    return {
      kind: "failure",
      output: failureOutput(2, "report-invalid", `${path}: ${message}`),
    };
  }
  return { kind: "ok", report: parsed.report };
}

function unwrapSimulationReportEnvelope(value: unknown): unknown {
  if (!isPlainJsonObject(value)) return value;
  if (value.schemaVersion !== ENVELOPE_SCHEMA_VERSION || !("result" in value)) return value;
  const result = value.result;
  if (!isPlainJsonObject(result) || !("report" in result)) return value;
  return result.report;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function printCompareHuman(
  report: SimulationCompareReportV1,
  basePath: string,
  candidatePath: string,
  quiet: boolean,
  io: GamectlIo,
): void {
  if (quiet) {
    io.stdout(report.regressionCount === 0 ? "OK" : "FAIL");
    return;
  }
  io.stdout(
    `compare ${basePath} vs ${candidatePath}: ${String(report.metrics.length)} metrics, ${String(report.regressionCount)} regression(s)`,
  );
  for (const row of report.metrics) {
    io.stdout(
      `  ${row.metric} baseline=${formatMetricNumber(row.baseline)} candidate=${formatMetricNumber(row.candidate)} delta=${formatMetricNumber(row.delta)} threshold=${formatMetricNumber(row.threshold)} ${row.disposition}`,
    );
  }
}

function formatMetricNumber(value: number | null): string {
  return value === null ? "(none)" : String(value);
}

async function runFixtureList(context: CliContext, io: GamectlIo): Promise<HandlerOutput> {
  const fixturesDirectory = resolve(context.repositoryRoot, "fixtures", "gameplay");
  const entries = await readdir(fixturesDirectory).catch(() => null);
  if (entries === null) {
    if (!context.json) {
      io.stdout(context.quiet ? "OK" : "0 fixtures");
    }
    return successOutput({ count: 0, fixtures: [] });
  }
  const fixtures: GameplayFixtureSummaryV1[] = [];
  const diagnostics: string[] = [];
  const jsoncEntries = entries.toSorted().filter((entry) => entry.endsWith(".jsonc"));
  const texts = await Promise.all(
    jsoncEntries.map((entry) =>
      readFile(resolve(fixturesDirectory, entry), "utf8").catch(() => null),
    ),
  );
  for (const [index, text] of texts.entries()) {
    const entry = jsoncEntries[index];
    if (entry === undefined || text === null) continue;
    const parsed = parseGameplayFixtureV1(parseJsonc(text));
    if (parsed.kind === "invalid") {
      for (const diagnostic of parsed.diagnostics) {
        diagnostics.push(`${entry}: ${diagnostic.code}: ${diagnostic.message}`);
      }
      continue;
    }
    fixtures.push({
      id: parsed.fixture.id,
      slice: parsed.fixture.slice,
      seed: parsed.fixture.seed,
      answers: parsed.fixture.answers,
      path: `fixtures/gameplay/${entry}`,
    });
  }
  if (diagnostics.length > 0) {
    return failureOutput(
      1,
      "fixture-invalid",
      `gameplay fixtures are invalid: ${diagnostics.join("; ")}`,
    );
  }
  if (!context.json) printFixtureListHuman(fixtures, context.quiet, io);
  return successOutput({ count: fixtures.length, fixtures });
}

type GameplayFixtureSummaryV1 = Readonly<{
  id: string;
  slice: string;
  seed: number;
  answers: GameplayFixtureV1["answers"];
  path: string;
}>;

function printFixtureListHuman(
  fixtures: readonly GameplayFixtureSummaryV1[],
  quiet: boolean,
  io: GamectlIo,
): void {
  if (quiet) {
    for (const fixture of fixtures) io.stdout(fixture.id);
    return;
  }
  io.stdout(`${String(fixtures.length)} fixtures`);
  for (const fixture of fixtures) {
    io.stdout(
      `${fixture.id}\t${fixture.slice}\tseed=${String(fixture.seed)}\t${formatFixtureAnswers(fixture.answers)}\t${fixture.path}`,
    );
  }
}

function formatFixtureAnswers(answers: GameplayFixtureV1["answers"]): string {
  const parts: string[] = [];
  if (answers.access !== undefined) parts.push(`access=${answers.access}`);
  if (answers.learning !== undefined) parts.push(`learning=${answers.learning}`);
  if (answers.response !== undefined) parts.push(`response=${answers.response}`);
  return parts.length === 0 ? "(policy-driven)" : parts.join(",");
}

async function runFixtureMaterialize(
  options: Readonly<{ id: string; policy?: string | undefined }>,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const policies = resolvePolicies(options.policy);
  if (policies === null) {
    return failureOutput(
      2,
      "invalid-filter",
      `--policy must be 'all' or a comma list of ${SIMULATION_POLICY_IDS.join(", ")}`,
    );
  }
  const loadedFixture = await loadGameplayFixtureV1(options.id, context);
  if (loadedFixture.kind === "failure") return loadedFixture.output;
  const fixture = loadedFixture.fixture;

  const loaded = await loadJanuarySimulationHarness(context);
  if (loaded.kind === "failure") return loaded.output;
  const harness = loaded.harness;

  const runs = policies.map((policyId) => {
    const run = runJanuaryCommandSequence({
      runnerId: policyId,
      seed: fixture.seed,
      contentFingerprint: harness.context.contentFingerprint,
      steps: harness.steps,
      plan: harness.plan,
      rulesetFingerprint: harness.rulesetFingerprint,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      answers: createJanuary1990AnswerProviders({
        policyId,
        seed: fixture.seed,
        fixtureAnswers: fixture.answers,
      }),
    });
    return {
      seed: run.seed,
      policyId: run.policyId,
      terminalState: run.terminalState,
      qualityScores: run.metrics.qualityScores,
    };
  });

  if (!context.json) printMaterializeHuman(fixture.id, runs, context.quiet, io);
  return successOutput({ fixtureId: fixture.id, runs });
}

async function loadGameplayFixtureV1(
  fixtureId: string,
  context: CliContext,
): Promise<
  | Readonly<{ kind: "ok"; fixture: GameplayFixtureV1 }>
  | Readonly<{ kind: "failure"; output: HandlerOutput }>
> {
  const fixturePath = resolve(context.repositoryRoot, "fixtures", "gameplay", `${fixtureId}.jsonc`);
  const file = await readRepositoryFile(fixturePath);
  if (file.kind === "not-found") {
    return {
      kind: "failure",
      output: failureOutput(2, "fixture-not-found", `gameplay fixture not found: ${fixtureId}`),
    };
  }
  if (file.kind === "unreadable") {
    return {
      kind: "failure",
      output: failureOutput(
        4,
        "file-unreadable",
        `gameplay fixture cannot be read: ${file.message}`,
      ),
    };
  }
  const parsed = parseGameplayFixtureV1(parseJsonc(file.text));
  if (parsed.kind === "invalid") {
    const message = parsed.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    return {
      kind: "failure",
      output: failureOutput(1, "fixture-invalid", `${fixtureId}: ${message}`),
    };
  }
  if (parsed.fixture.id !== fixtureId) {
    return {
      kind: "failure",
      output: failureOutput(
        1,
        "fixture-invalid",
        `${fixtureId}: fixture id ${JSON.stringify(parsed.fixture.id)} does not match the requested id`,
      ),
    };
  }
  return { kind: "ok", fixture: parsed.fixture };
}

function printMaterializeHuman(
  fixtureId: string,
  runs: readonly Readonly<{
    seed: string;
    policyId: string;
    terminalState: string;
    qualityScores: Readonly<{
      clarity: number | null;
      correctness: number | null;
      reliability: number | null;
    }>;
  }>[],
  quiet: boolean,
  io: GamectlIo,
): void {
  if (quiet) {
    io.stdout(runs.every((run) => run.terminalState === "completed") ? "OK" : "FAIL");
    return;
  }
  io.stdout(`materialize ${fixtureId}: ${String(runs.length)} run(s)`);
  for (const run of runs) {
    const scores = run.qualityScores;
    io.stdout(
      `  seed=${run.seed} policy=${run.policyId} terminal=${run.terminalState} scores: ${
        scores === null
          ? "(not completed)"
          : `clarity=${String(scores.clarity)} correctness=${String(scores.correctness)} reliability=${String(scores.reliability)}`
      }`,
    );
  }
}

async function runExplain(
  options: Readonly<{
    repro?: string | undefined;
    outcome?: string | undefined;
    access?: string | undefined;
    learning?: string | undefined;
    response?: string | undefined;
    roll?: string | undefined;
  }>,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  if (options.repro !== undefined && options.outcome !== undefined) {
    return failureOutput(2, "usage-error", "--repro and --outcome are mutually exclusive");
  }
  if (options.repro === undefined && options.outcome === undefined) {
    return failureOutput(2, "usage-error", "explain requires --repro <file> or --outcome <slice>");
  }
  if (options.repro !== undefined) {
    const strayFlags = [
      ["--access", options.access],
      ["--learning", options.learning],
      ["--response", options.response],
      ["--roll", options.roll],
    ].filter(([, value]) => value !== undefined);
    if (strayFlags.length > 0) {
      return failureOutput(
        2,
        "usage-error",
        `explain --repro derives inputs from the repro; not allowed: ${strayFlags.map(([flag]) => flag).join(", ")}`,
      );
    }
  }

  const loaded = await loadJanuarySimulationHarness(context);
  if (loaded.kind === "failure") return loaded.output;
  const harness = loaded.harness;

  if (options.repro !== undefined) {
    return explainFromRepro(options.repro, harness, context, io);
  }
  if (options.outcome === undefined) {
    return failureOutput(2, "usage-error", "explain requires --repro <file> or --outcome <slice>");
  }
  return explainFromOutcome({ ...options, outcome: options.outcome }, harness, context, io);
}

function explainFromOutcome(
  options: Readonly<{
    outcome: string;
    access?: string | undefined;
    learning?: string | undefined;
    response?: string | undefined;
    roll?: string | undefined;
  }>,
  harness: JanuaryHarness,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  if (options.outcome !== "january-1990") {
    return Promise.resolve(
      failureOutput(
        2,
        "unknown-entity",
        `unknown explain outcome target ${JSON.stringify(options.outcome)}; the only materialized slice is january-1990`,
      ),
    );
  }
  const missing = [
    [options.access, "--access"],
    [options.learning, "--learning"],
    [options.response, "--response"],
    [options.roll, "--roll"],
  ].filter(([value]) => value === undefined);
  if (missing.length > 0) {
    return Promise.resolve(
      failureOutput(
        2,
        "explain-input-missing",
        `explain --outcome january-1990 requires ${missing.map(([, flag]) => flag).join(", ")}`,
      ),
    );
  }
  const access = pickClosed(options.access, ACCESS_ROUTES);
  const learning = pickClosed(options.learning, LEARNING_PRACTICES);
  const response = pickClosed(options.response, DEFECT_RESPONSES);
  const roll = parseRollOption(options.roll);
  if (access === null || learning === null || response === null || roll === null) {
    return Promise.resolve(
      failureOutput(
        2,
        "explain-input-invalid",
        "explain inputs must use the closed January vocabulary (routes, practices, responses, integer roll)",
      ),
    );
  }
  const explained = explainJanuaryQualityV1(harness.balance, {
    access,
    learning,
    response,
    roll,
  });
  if (explained.kind === "invalid") {
    const message = explained.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    return Promise.resolve(failureOutput(2, "explain-input-invalid", message));
  }
  return Promise.resolve(finishExplain(explained.explanation, context, io));
}

const ACCESS_ROUTES = ["home-pc", "shared-school-pc"] as const;
const LEARNING_PRACTICES = ["read-and-run", "edit-and-debug"] as const;
const DEFECT_RESPONSES = ["inspect-listing", "change-input", "ask-for-guidance"] as const;

function pickClosed<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return value !== undefined && allowed.some((candidate) => candidate === value)
    ? (value as T)
    : null;
}

function parseRollOption(value: string | undefined): number | null {
  if (value === undefined) return null;
  const match = /^-?(0|[1-9][0-9]*)$/u.exec(value);
  return match === null ? null : Number(value);
}

async function explainFromRepro(
  reproPath: string,
  harness: JanuaryHarness,
  context: CliContext,
  io: GamectlIo,
): Promise<HandlerOutput> {
  const absolutePath = isAbsolute(reproPath)
    ? reproPath
    : resolve(context.repositoryRoot, reproPath);
  const file = await readRepositoryFile(absolutePath);
  if (file.kind === "not-found") {
    return failureOutput(2, "repro-not-found", `repro file not found: ${reproPath}`);
  }
  if (file.kind === "unreadable") {
    return failureOutput(4, "file-unreadable", `repro file cannot be read: ${file.message}`);
  }
  const parsed = parseGameReproV1(parseJsonc(file.text));
  if (parsed.kind === "invalid") {
    const message = parsed.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    return failureOutput(2, "repro-invalid", message);
  }
  const commands = new Map(
    parsed.repro.commands.map((command) => [command.decisionId, command.value] as const),
  );
  const access = pickClosed(commands.get("january-1990/access"), ACCESS_ROUTES);
  const learning = pickClosed(commands.get("january-1990/learning"), LEARNING_PRACTICES);
  const response = pickClosed(commands.get("january-1990/defect"), DEFECT_RESPONSES);
  if (access === null || learning === null || response === null) {
    return failureOutput(
      2,
      "explain-input-missing",
      "repro must answer all January decisions (access, learning, defect) with closed values before its outcome can be explained",
    );
  }

  const result = replayJanuaryReproV1({
    context: harness.context,
    balance: harness.balance,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    repro: parsed.repro,
    captureTrace: true,
  });
  if (result.kind === "incompatible" || result.kind === "invalid") {
    const exitCode = result.kind === "incompatible" ? 3 : 2;
    const code = result.kind === "incompatible" ? "repro-incompatible" : "repro-invalid";
    return failureOutput(
      exitCode,
      code,
      result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
    );
  }
  const scores = result.trace?.materializedQualityScores;
  if (result.kind !== "reproduced" || scores === undefined || scores === null) {
    return failureOutput(
      1,
      "explain-requires-completed-run",
      "explain needs a reproduced repro whose run completed; the replayed run produced no outcome",
    );
  }
  const derivedRoll = deriveJanuaryOutcomeRollV1(
    harness.balance,
    { access, learning, response },
    scores,
  );
  if (derivedRoll.kind === "invalid") {
    return failureOutput(
      1,
      "explain-outcome-mismatch",
      derivedRoll.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
    );
  }
  const explained = explainJanuaryQualityV1(harness.balance, {
    access,
    learning,
    response,
    roll: derivedRoll.roll,
  });
  if (explained.kind === "invalid") {
    return failureOutput(
      1,
      "explain-outcome-mismatch",
      explained.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
    );
  }
  return finishExplain(explained.explanation, context, io);
}

function finishExplain(
  explanation: JanuaryQualityExplanationV1,
  context: CliContext,
  io: GamectlIo,
): HandlerOutput {
  if (!context.json) printExplanationHuman(explanation, context.quiet, io);
  return successOutput({ explanation });
}

function printExplanationHuman(
  explanation: JanuaryQualityExplanationV1,
  quiet: boolean,
  io: GamectlIo,
): void {
  if (quiet) {
    io.stdout("OK");
    return;
  }
  const inputs = explanation.inputs;
  io.stdout(
    `explain ${explanation.ruleVersion}: access=${inputs.access} learning=${inputs.learning} response=${inputs.response} roll=${String(inputs.roll)}`,
  );
  io.stdout(
    `result: clarity=${String(explanation.result.clarity)} correctness=${String(explanation.result.correctness)} reliability=${String(explanation.result.reliability)}`,
  );
  for (const contribution of explanation.contributions) {
    const parts: string[] = [];
    if (contribution.clarity !== undefined) parts.push(`clarity=${String(contribution.clarity)}`);
    if (contribution.correctness !== undefined) {
      parts.push(`correctness=${String(contribution.correctness)}`);
    }
    if (contribution.reliability !== undefined) {
      parts.push(`reliability=${String(contribution.reliability)}`);
    }
    io.stdout(`  ${contribution.reasonCode} ${parts.join(" ")}`);
  }
}

async function validateRepositoryRoot(
  rawRoot: string | undefined,
  repositoryRoot: string,
): Promise<Readonly<{ exitCode: number; error: CommandFailure }> | null> {
  if (rawRoot !== undefined && rawRoot.trim().length === 0) {
    return {
      exitCode: 2,
      error: { code: "invalid-root", message: "--root must be a non-empty path" },
    };
  }
  const metadata = await stat(repositoryRoot).catch(() => undefined);
  if (metadata === undefined || !metadata.isDirectory()) {
    return {
      exitCode: 2,
      error: { code: "invalid-root", message: `--root is not a directory: ${repositoryRoot}` },
    };
  }
  return null;
}

function failureOutput(
  exitCode: number,
  code: string,
  message: string,
  diagnostics?: readonly StructuredDiagnosticV1[],
): HandlerOutput {
  return {
    exitCode,
    payload: {
      ok: false,
      error: diagnostics === undefined ? { code, message } : { code, message, diagnostics },
    },
  };
}

function contentFailure(diagnostics: readonly StructuredDiagnosticV1[]): HandlerOutput {
  const first = diagnostics[0];
  if (first !== undefined && first.code === "CONFIG_MISSING") {
    return failureOutput(
      4,
      "config-missing",
      "content environment is not initialized: content build config is missing",
      diagnostics,
    );
  }
  return failureOutput(
    1,
    "content-invalid",
    `content catalog is invalid: ${String(diagnostics.length)} diagnostic(s)`,
    diagnostics,
  );
}

function unknownEntity(id: string): HandlerOutput {
  return failureOutput(2, "unknown-entity", `unknown catalog entry ${JSON.stringify(id)}`);
}

function projectEntry(entry: ContentCatalogEntryV1): ProjectedEntry {
  return {
    id: entry.id,
    kind: entry.kind,
    era: entry.era,
    domain: entry.domain,
    entryPoint: entry.entryPoint,
    sourcePath: entry.sourcePath,
  };
}

function isEntryKind(value: string): value is EntryKind {
  return ENTRY_KINDS.some((kind) => kind === value);
}

function printFailureHuman(error: CommandFailure | undefined, io: GamectlIo): void {
  if (error === undefined) return;
  if (error.diagnostics !== undefined) {
    for (const diagnostic of error.diagnostics) io.stderr(formatDiagnostic(diagnostic));
    return;
  }
  io.stderr(`error: ${error.code}: ${error.message}`);
}

function formatDiagnostic(diagnostic: StructuredDiagnosticV1): string {
  let text = diagnostic.code;
  if (diagnostic.path !== undefined) {
    text += ` ${diagnostic.path}`;
    if (diagnostic.line !== undefined) text += `:${String(diagnostic.line)}`;
    if (diagnostic.column !== undefined) text += `:${String(diagnostic.column)}`;
  }
  if (diagnostic.entityId !== undefined) text += ` [${diagnostic.entityId}]`;
  return `${text} ${diagnostic.message}`;
}

function printCatalogListHuman(
  entries: readonly ProjectedEntry[],
  quiet: boolean,
  io: GamectlIo,
): void {
  if (quiet) {
    for (const entry of entries) io.stdout(entry.id);
    return;
  }
  io.stdout(`${String(entries.length)} entries`);
  for (const entry of entries) {
    io.stdout(`${entry.id}\t${entry.kind}\t${entry.era}/${entry.domain}\t${entry.sourcePath}`);
  }
}

function printEntryHuman(entry: ContentCatalogEntryV1, io: GamectlIo): void {
  io.stdout(`id: ${entry.id}`);
  io.stdout(`kind: ${entry.kind}`);
  io.stdout(`domain: ${entry.domain}`);
  io.stdout(`era: ${entry.era}`);
  io.stdout(`availableFrom: ${entry.availableFrom}`);
  if (entry.availableTo !== undefined) io.stdout(`availableTo: ${entry.availableTo}`);
  io.stdout(`entryPoint: ${entry.entryPoint ? "true" : "false"}`);
  io.stdout(
    `references: ${entry.references.length === 0 ? "(none)" : entry.references.join(", ")}`,
  );
  io.stdout(
    `provenance: ${
      entry.provenance.length === 0 ? "(none)" : entry.provenance.map(formatProvenance).join(", ")
    }`,
  );
  io.stdout(`sourcePath: ${entry.sourcePath}`);
}

function formatProvenance(provenance: ContentCatalogEntryV1["provenance"][number]): string {
  return provenance.locator === undefined
    ? `${provenance.sourceId} (${provenance.title})`
    : `${provenance.sourceId} (${provenance.title}; ${provenance.locator})`;
}

function printReferencesHuman(references: CatalogReferencesV1, io: GamectlIo): void {
  io.stdout(`id: ${references.id}`);
  if (references.outgoing.length === 0) {
    io.stdout("outgoing: (none)");
  } else {
    io.stdout("outgoing:");
    for (const reference of references.outgoing) {
      io.stdout(`  ${reference.id} (${reference.resolved ? "resolved" : "unresolved"})`);
    }
  }
  if (references.incoming.length === 0) {
    io.stdout("incoming: (none)");
  } else {
    io.stdout("incoming:");
    for (const incomingId of references.incoming) io.stdout(`  ${incomingId}`);
  }
}

function printImpactHuman(impact: CatalogImpactV1, io: GamectlIo): void {
  io.stdout(`id: ${impact.id}`);
  io.stdout(`sourcePath: ${impact.sourcePath}`);
  io.stdout(`consumers: ${impact.consumers.length === 0 ? "(none)" : impact.consumers.join(", ")}`);
  io.stdout(`tests: ${impact.tests.length === 0 ? "(none)" : impact.tests.join(", ")}`);
  io.stdout(`zones: ${impact.zones.length === 0 ? "(none)" : impact.zones.join(", ")}`);
}

function printDoctorHuman(report: DoctorReportV1, quiet: boolean, io: GamectlIo): void {
  if (quiet) {
    io.stdout(report.ok ? "OK" : "FAIL");
    return;
  }
  for (const check of report.checks) {
    io.stdout(`${check.ok ? "ok" : "FAIL"} ${check.id}: ${check.detail}`);
  }
}

type RepositoryFileReadV1 =
  | Readonly<{ kind: "ok"; text: string }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "unreadable"; message: string }>;

async function readRepositoryFile(path: string): Promise<RepositoryFileReadV1> {
  try {
    return { kind: "ok", text: await readFile(path, "utf8") };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENOENT") return { kind: "not-found" };
    return {
      kind: "unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await runGamectlCli(process.argv.slice(2), {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}
