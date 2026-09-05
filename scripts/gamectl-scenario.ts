import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { parseArgs } from "node:util";

import { parse as parseJsonc } from "jsonc-parser";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { fingerprint } from "@runtime-human/game-core";
import {
  certifyScenarioProgramV1,
  compileScenarioProgramV1,
  resolveScenarioCapabilitiesV1,
  type StructuredDiagnosticV1,
} from "@runtime-human/game-devtools";
import type {
  ScenarioArtifactV1,
  ScenarioCapabilityRegistryV1,
  ScenarioExecutionPolicyV1,
  ScenarioProgramV1,
  ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";
import { SCENARIO_ARTIFACT_SCHEMA_VERSION } from "../packages/game-schema/src/scenario-artifact";

export type ScenarioGamectlIo = Readonly<{
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}>;

const ENVELOPE_SCHEMA_VERSION = "runtime-human-gamectl-v1" as const;
const FINGERPRINT = /^[0-9a-f]{64}$/u;
const MVP_SCENARIO_POLICY_V1: ScenarioExecutionPolicyV1 = Object.freeze({
  schemaVersion: "scenario-execution-policy-v1",
  policyId: "mvp-casual-ordinary-month-v1",
  requireAcyclic: true,
  blockingDecisionsMax: 1,
});

type ScenarioCommandName = "scenario.check" | "scenario.compile" | "scenario.inspect";

type ScenarioCommandRequest =
  | Readonly<{ kind: "scenario.check"; path: string }>
  | Readonly<{ kind: "scenario.compile"; path: string }>
  | Readonly<{ kind: "scenario.inspect"; path: string }>;

type ScenarioRoute =
  | Readonly<{ request: ScenarioCommandRequest }>
  | Readonly<{
      command: ScenarioCommandName | "unknown";
      errorCode: "unknown-command" | "usage-error";
      message: string;
    }>;

type ScenarioCommandFailure = Readonly<{
  code: string;
  message: string;
  diagnostics?: readonly StructuredDiagnosticV1[];
}>;

type ScenarioHandlerPayload = Readonly<{
  ok: boolean;
  result?: unknown;
  error?: ScenarioCommandFailure;
}>;

type ScenarioHandlerOutput = Readonly<{
  exitCode: number;
  payload: ScenarioHandlerPayload;
}>;

type ScenarioPipeline = Readonly<{
  program: ScenarioProgramV1;
  capabilities: ScenarioResolvedCapabilitiesV1;
}>;

type ScenarioCliContext = Readonly<{
  repositoryRoot: string;
  json: boolean;
  quiet: boolean;
}>;

function parseScenarioArgs(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    options: {
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
      root: { type: "string" },
      registry: { type: "string" },
      out: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });
}

type ScenarioCliValues = ReturnType<typeof parseScenarioArgs>["values"];

export async function runScenarioGamectlCli(
  argv: readonly string[],
  io: ScenarioGamectlIo,
): Promise<number | null> {
  if (!targetsScenarioCommand(argv)) return null;

  let values: ScenarioCliValues;
  let positionals: string[];
  try {
    const parsed = parseScenarioArgs(argv);
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const command = inferScenarioCommand(argv);
    return emitRouteFailure(command, "usage-error", message, argv.includes("--json"), io);
  }

  const route = routeScenarioCommand(positionals);
  if (!("request" in route)) {
    return emitRouteFailure(route.command, route.errorCode, route.message, values.json, io);
  }

  const context: ScenarioCliContext = {
    repositoryRoot:
      values.root === undefined ? resolve(import.meta.dirname, "..") : resolve(values.root),
    json: values.json,
    quiet: values.quiet,
  };

  const rootFailure = await validateRepositoryRoot(values.root, context.repositoryRoot);
  if (rootFailure !== null) {
    emitScenarioOutput(route.request.kind, rootFailure, context, io);
    return rootFailure.exitCode;
  }

  const output = await executeScenarioCommand(route.request, values, context, io);
  emitScenarioOutput(route.request.kind, output, context, io);
  return output.exitCode;
}

function targetsScenarioCommand(argv: readonly string[]): boolean {
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === undefined) break;
    if (value === "--json" || value === "--quiet") continue;
    if (value === "--root" || value === "--registry" || value === "--out") {
      index += 1;
      continue;
    }
    if (value.startsWith("-")) return false;
    return value === "scenario";
  }
  return false;
}

function inferScenarioCommand(argv: readonly string[]): ScenarioCommandName | "unknown" {
  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === undefined) break;
    if (value === "--json" || value === "--quiet") continue;
    if (value === "--root" || value === "--registry" || value === "--out") {
      index += 1;
      continue;
    }
    if (!value.startsWith("-")) positionals.push(value);
  }
  if (positionals[0] !== "scenario") return "unknown";
  return scenarioCommandName(positionals[1]);
}

function routeScenarioCommand(positionals: readonly string[]): ScenarioRoute {
  if (positionals[0] !== "scenario") {
    return {
      command: "unknown",
      errorCode: "unknown-command",
      message: "missing scenario command",
    };
  }
  const secondary = positionals[1];
  const path = positionals[2];
  const command = scenarioCommandName(secondary);
  if (command === "unknown") {
    return {
      command,
      errorCode: "unknown-command",
      message:
        secondary === undefined
          ? "missing scenario subcommand"
          : `unknown scenario subcommand ${JSON.stringify(secondary)}`,
    };
  }
  if (path === undefined || positionals.length !== 3) {
    return {
      command,
      errorCode: "usage-error",
      message:
        command === "scenario.inspect"
          ? "scenario inspect expects exactly one <artifact>"
          : `scenario ${secondary} expects exactly one <path>`,
    };
  }
  return { request: { kind: command, path } };
}

function scenarioCommandName(value: string | undefined): ScenarioCommandName | "unknown" {
  if (value === "check") return "scenario.check";
  if (value === "compile") return "scenario.compile";
  if (value === "inspect") return "scenario.inspect";
  return "unknown";
}

async function executeScenarioCommand(
  command: ScenarioCommandRequest,
  values: ScenarioCliValues,
  context: ScenarioCliContext,
  io: ScenarioGamectlIo,
): Promise<ScenarioHandlerOutput> {
  switch (command.kind) {
    case "scenario.check":
      if (values.registry === undefined || values.registry.trim().length === 0) {
        return failureOutput(2, "usage-error", "scenario check requires --registry <path>");
      }
      if (values.out !== undefined) {
        return failureOutput(2, "usage-error", "scenario check does not accept --out");
      }
      return runScenarioCheck(command.path, values.registry, context, io);
    case "scenario.compile":
      if (values.registry === undefined || values.registry.trim().length === 0) {
        return failureOutput(2, "usage-error", "scenario compile requires --registry <path>");
      }
      if (values.out !== undefined && values.out.trim().length === 0) {
        return failureOutput(2, "usage-error", "--out must be a non-empty path");
      }
      return runScenarioCompile(command.path, values.registry, values.out, context, io);
    case "scenario.inspect":
      if (values.registry !== undefined || values.out !== undefined) {
        return failureOutput(2, "usage-error", "scenario inspect accepts an artifact path only");
      }
      return runScenarioInspect(command.path, context, io);
  }
}

async function runScenarioCheck(
  scenarioPath: string,
  registryPath: string,
  context: ScenarioCliContext,
  io: ScenarioGamectlIo,
): Promise<ScenarioHandlerOutput> {
  const loaded = await loadScenarioPipeline(scenarioPath, registryPath, context);
  if (loaded.kind === "failure") return loaded.output;
  if (!context.json) {
    io.stdout(context.quiet ? "OK" : `scenario ${loaded.pipeline.program.scenarioId}: OK`);
  }
  return successOutput({ scenarioId: loaded.pipeline.program.scenarioId, diagnostics: [] });
}

async function runScenarioCompile(
  scenarioPath: string,
  registryPath: string,
  outPath: string | undefined,
  context: ScenarioCliContext,
  io: ScenarioGamectlIo,
): Promise<ScenarioHandlerOutput> {
  const loaded = await loadScenarioPipeline(scenarioPath, registryPath, context);
  if (loaded.kind === "failure") return loaded.output;
  const { program, capabilities } = loaded.pipeline;
  const certified = certifyScenarioProgramV1(
    program,
    MVP_SCENARIO_POLICY_V1,
    { fingerprint },
    capabilities,
  );
  if (certified.kind === "failure") return scenarioDiagnosticsFailure(certified.diagnostics);

  const artifact: ScenarioArtifactV1 = {
    schemaVersion: SCENARIO_ARTIFACT_SCHEMA_VERSION,
    program,
    capabilities,
    certificate: certified.certificate,
  };

  if (outPath !== undefined) {
    const absoluteOut = resolveInputPath(outPath, context.repositoryRoot);
    try {
      await mkdir(dirname(absoluteOut), { recursive: true });
      await writeFile(absoluteOut, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failureOutput(4, "file-unwritable", `scenario artifact cannot be written: ${message}`);
    }
  }

  if (!context.json) {
    io.stdout(
      context.quiet
        ? "OK"
        : `scenario ${program.scenarioId}: ${String(program.instructions.length)} instruction(s), certificate ${certified.certificate.certificateFingerprint}`,
    );
  }
  return successOutput({ artifact });
}

async function runScenarioInspect(
  artifactPath: string,
  context: ScenarioCliContext,
  io: ScenarioGamectlIo,
): Promise<ScenarioHandlerOutput> {
  const loaded = await loadJsonFile(artifactPath, "scenario artifact", context.repositoryRoot);
  if (loaded.kind === "failure") return loaded.output;
  const artifact = parseScenarioArtifact(loaded.value);
  if (artifact === null) {
    return failureOutput(
      2,
      "scenario-artifact-invalid",
      "scenario artifact is malformed or inconsistent",
    );
  }

  const summary = {
    scenarioId: artifact.program.scenarioId,
    instructionCount: artifact.program.instructions.length,
    blockingDecisionsMin: artifact.certificate.blockingDecisionsMin,
    blockingDecisionsMax: artifact.certificate.blockingDecisionsMax,
    transitionBudgetMax: artifact.certificate.transitionBudgetMax,
    providerCallsMax: artifact.certificate.providerCallsMax,
    rngCallsMax: artifact.certificate.rngCallsMax,
    sourceFingerprint: artifact.program.sourceFingerprint,
    programFingerprint: artifact.program.programFingerprint,
    rulesFingerprint: artifact.capabilities.rulesFingerprint,
    certificateFingerprint: artifact.certificate.certificateFingerprint,
  } as const;

  if (!context.json) {
    io.stdout(
      context.quiet
        ? "OK"
        : `scenario ${summary.scenarioId}: instructions=${String(summary.instructionCount)} transitions<=${String(summary.transitionBudgetMax)} rng<=${String(summary.rngCallsMax)}`,
    );
  }
  return successOutput(summary);
}

async function loadScenarioPipeline(
  scenarioPath: string,
  registryPath: string,
  context: ScenarioCliContext,
): Promise<
  | Readonly<{ kind: "success"; pipeline: ScenarioPipeline }>
  | Readonly<{ kind: "failure"; output: ScenarioHandlerOutput }>
> {
  const scenarioFile = await loadJsonFile(scenarioPath, "scenario source", context.repositoryRoot);
  if (scenarioFile.kind === "failure") return scenarioFile;
  if (!isScenarioAuthoringCandidate(scenarioFile.value)) {
    return {
      kind: "failure",
      output: failureOutput(1, "scenario-invalid", "scenario source does not match scenario-v1"),
    };
  }

  let compiled: ReturnType<typeof compileScenarioProgramV1>;
  try {
    compiled = compileScenarioProgramV1(scenarioFile.value, { fingerprint });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "failure", output: failureOutput(1, "scenario-invalid", message) };
  }
  if (compiled.kind === "failure") {
    return { kind: "failure", output: scenarioDiagnosticsFailure(compiled.diagnostics) };
  }

  const registryFile = await loadJsonFile(
    registryPath,
    "scenario capability registry",
    context.repositoryRoot,
  );
  if (registryFile.kind === "failure") return registryFile;
  if (!isScenarioCapabilityRegistryCandidate(registryFile.value)) {
    return {
      kind: "failure",
      output: failureOutput(
        1,
        "scenario-registry-invalid",
        "scenario capability registry does not match scenario-capability-registry-v1",
      ),
    };
  }

  try {
    const resolved = resolveScenarioCapabilitiesV1(compiled.program, registryFile.value, {
      fingerprint,
    });
    if (resolved.kind === "failure") {
      return { kind: "failure", output: scenarioDiagnosticsFailure(resolved.diagnostics) };
    }
    return {
      kind: "success",
      pipeline: { program: compiled.program, capabilities: resolved.capabilities },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: "failure",
      output: failureOutput(1, "scenario-registry-invalid", message),
    };
  }
}

function isScenarioAuthoringCandidate(value: unknown): value is ScenarioAuthoringDocument {
  return (
    isPlainJsonObject(value) &&
    value.schemaVersion === "scenario-v1" &&
    typeof value.id === "string" &&
    typeof value.entry === "string" &&
    isPlainJsonObject(value.nodes)
  );
}

function isScenarioCapabilityRegistryCandidate(
  value: unknown,
): value is ScenarioCapabilityRegistryV1 {
  return (
    isPlainJsonObject(value) &&
    value.schemaVersion === "scenario-capability-registry-v1" &&
    Array.isArray(value.providers) &&
    Array.isArray(value.predicates)
  );
}

function parseScenarioArtifact(value: unknown): ScenarioArtifactV1 | null {
  if (!isPlainJsonObject(value) || value.schemaVersion !== SCENARIO_ARTIFACT_SCHEMA_VERSION) {
    return null;
  }
  const program = value.program;
  const capabilities = value.capabilities;
  const certificate = value.certificate;
  if (
    !isPlainJsonObject(program) ||
    !isPlainJsonObject(capabilities) ||
    !isPlainJsonObject(certificate)
  ) {
    return null;
  }
  if (
    program.schemaVersion !== "scenario-program-v1" ||
    typeof program.scenarioId !== "string" ||
    !Array.isArray(program.instructions) ||
    !isFingerprint(program.sourceFingerprint) ||
    !isFingerprint(program.programFingerprint)
  ) {
    return null;
  }
  if (
    capabilities.schemaVersion !== "scenario-resolved-capabilities-v1" ||
    capabilities.programFingerprint !== program.programFingerprint ||
    !isFingerprint(capabilities.rulesFingerprint)
  ) {
    return null;
  }
  if (
    certificate.schemaVersion !== "scenario-certificate-v1" ||
    certificate.programFingerprint !== program.programFingerprint ||
    certificate.rulesFingerprint !== capabilities.rulesFingerprint ||
    certificate.instructionCount !== program.instructions.length ||
    !isNonNegativeSafeInteger(certificate.transitionBudgetMax) ||
    !isNonNegativeSafeInteger(certificate.blockingDecisionsMin) ||
    !isNonNegativeSafeInteger(certificate.blockingDecisionsMax) ||
    !isNonNegativeSafeInteger(certificate.providerCallsMax) ||
    !isNonNegativeSafeInteger(certificate.rngCallsMax) ||
    !isFingerprint(certificate.certificateFingerprint)
  ) {
    return null;
  }
  return value as unknown as ScenarioArtifactV1;
}

function isFingerprint(value: unknown): value is string {
  return typeof value === "string" && FINGERPRINT.test(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

async function loadJsonFile(
  rawPath: string,
  subject: string,
  repositoryRoot: string,
): Promise<
  | Readonly<{ kind: "success"; value: unknown }>
  | Readonly<{ kind: "failure"; output: ScenarioHandlerOutput }>
> {
  if (rawPath.trim().length === 0) {
    return {
      kind: "failure",
      output: failureOutput(2, "usage-error", `${subject} path must be non-empty`),
    };
  }
  const absolutePath = resolveInputPath(rawPath, repositoryRoot);
  let text: string;
  try {
    text = await readFile(absolutePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENOENT") {
      return {
        kind: "failure",
        output: failureOutput(2, "file-not-found", `${subject} not found: ${rawPath}`),
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: "failure",
      output: failureOutput(4, "file-unreadable", `${subject} cannot be read: ${message}`),
    };
  }
  try {
    return { kind: "success", value: parseJsonc(text) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: "failure",
      output: failureOutput(2, "json-invalid", `${subject} is not valid JSON/JSONC: ${message}`),
    };
  }
}

function resolveInputPath(path: string, repositoryRoot: string): string {
  return isAbsolute(path) ? path : resolve(repositoryRoot, path);
}

async function validateRepositoryRoot(
  rawRoot: string | undefined,
  repositoryRoot: string,
): Promise<ScenarioHandlerOutput | null> {
  if (rawRoot !== undefined && rawRoot.trim().length === 0) {
    return failureOutput(2, "invalid-root", "--root must be a non-empty path");
  }
  const metadata = await stat(repositoryRoot).catch(() => undefined);
  if (metadata === undefined || !metadata.isDirectory()) {
    return failureOutput(2, "invalid-root", `--root is not a directory: ${repositoryRoot}`);
  }
  return null;
}

function scenarioDiagnosticsFailure(
  diagnostics: readonly StructuredDiagnosticV1[],
): ScenarioHandlerOutput {
  return failureOutput(
    1,
    "scenario-invalid",
    `scenario is invalid: ${String(diagnostics.length)} diagnostic(s)`,
    diagnostics,
  );
}

function successOutput(result: unknown): ScenarioHandlerOutput {
  return { exitCode: 0, payload: { ok: true, result } };
}

function failureOutput(
  exitCode: number,
  code: string,
  message: string,
  diagnostics?: readonly StructuredDiagnosticV1[],
): ScenarioHandlerOutput {
  return {
    exitCode,
    payload: {
      ok: false,
      error: diagnostics === undefined ? { code, message } : { code, message, diagnostics },
    },
  };
}

function emitScenarioOutput(
  command: ScenarioCommandName,
  output: ScenarioHandlerOutput,
  context: ScenarioCliContext,
  io: ScenarioGamectlIo,
): void {
  if (context.json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA_VERSION,
          command,
          ok: output.payload.ok,
          ...(output.payload.result !== undefined ? { result: output.payload.result } : {}),
          ...(output.payload.error !== undefined ? { error: output.payload.error } : {}),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!output.payload.ok && output.payload.error !== undefined) {
    const diagnostics = output.payload.error.diagnostics;
    if (diagnostics === undefined) {
      io.stderr(`error: ${output.payload.error.code}: ${output.payload.error.message}`);
    } else {
      for (const diagnostic of diagnostics) {
        io.stderr(`error: ${diagnostic.code}: ${diagnostic.message}`);
      }
    }
  }
}

function emitRouteFailure(
  command: ScenarioCommandName | "unknown",
  code: "unknown-command" | "usage-error",
  message: string,
  json: boolean,
  io: ScenarioGamectlIo,
): number {
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA_VERSION,
          command,
          ok: false,
          error: { code, message },
        },
        2,
      ),
    );
  } else {
    io.stderr(`error: ${code}: ${message}`);
  }
  return 2;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
