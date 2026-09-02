import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;
type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;
type CapturedIo = Readonly<{ stdout: string[]; stderr: string[]; io: GamectlIo }>;
type Envelope = Readonly<{
  schemaVersion: string;
  command: string;
  ok: boolean;
  result?: unknown;
  error?: Readonly<{
    code: string;
    message: string;
    diagnostics?: readonly Readonly<{ code: string; pointer?: string }>[];
  }>;
}>;

const gamectlModuleUrl = new URL("../scripts/gamectl.ts", import.meta.url).href;
let gamectlCliModule: Promise<GamectlCliModule> | undefined;
const tempRoots: string[] = [];

async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  gamectlCliModule ??= import(gamectlModuleUrl) as Promise<GamectlCliModule>;
  const { runGamectlCli: runCli } = await gamectlCliModule;
  return runCli(argv, io);
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) fs.rmSync(root, { recursive: true, force: true });
  }
});

function captureIo(): CapturedIo {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
    },
  };
}

function makeScenarioRepo(options: Readonly<{ unknownProvider?: boolean }> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-scenario-tooling-"));
  tempRoots.push(root);
  fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  fs.mkdirSync(path.join(root, "scenarios"), { recursive: true });

  fs.writeFileSync(
    path.join(root, "scenarios", "tooling.jsonc"),
    JSON.stringify(
      {
        schemaVersion: "scenario-v1",
        id: "scenario.tooling",
        entry: "a",
        nodes: {
          a: {
            kind: "provider",
            providerId: options.unknownProvider === true ? "provider.missing" : "provider.project",
            next: "b",
          },
          b: { kind: "random-content", poolId: "pool.narrative", next: "c" },
          c: {
            kind: "gate",
            predicateId: "predicate.ready",
            pass: "d",
            fail: "d",
          },
          d: { kind: "complete" },
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(root, "scenarios", "registry.json"),
    JSON.stringify(
      {
        schemaVersion: "scenario-capability-registry-v1",
        providers: [
          {
            id: "provider.project",
            version: 1,
            deterministic: true,
            rngBudgetMax: 2,
            effectDomain: "project",
          },
        ],
        predicates: [
          {
            id: "predicate.ready",
            version: 1,
            deterministic: true,
            readOnly: true,
          },
        ],
      },
      null,
      2,
    ),
  );
  return root;
}

function parseEnvelope(stdout: readonly string[]): Envelope {
  return JSON.parse(stdout.join("\n")) as Envelope;
}

function resultAs<T>(envelope: Envelope): T {
  if (envelope.result === undefined) throw new Error("expected result in envelope");
  return envelope.result as T;
}

describe("gamectl scenario tooling", () => {
  it("checks authoring against the explicit capability registry", async () => {
    const root = makeScenarioRepo();
    const captured = captureIo();
    const exit = await runGamectlCli(
      [
        "--root",
        root,
        "--json",
        "scenario",
        "check",
        "scenarios/tooling.jsonc",
        "--registry",
        "scenarios/registry.json",
      ],
      captured.io,
    );

    expect(exit).toBe(0);
    expect(captured.stderr).toEqual([]);
    const envelope = parseEnvelope(captured.stdout);
    expect(envelope).toMatchObject({
      schemaVersion: "runtime-human-gamectl-v1",
      command: "scenario.check",
      ok: true,
    });
    expect(resultAs<{ scenarioId: string; diagnostics: unknown[] }>(envelope)).toEqual({
      scenarioId: "scenario.tooling",
      diagnostics: [],
    });
  });

  it("surfaces unresolved provider diagnostics instead of compiling through them", async () => {
    const root = makeScenarioRepo({ unknownProvider: true });
    const captured = captureIo();
    const exit = await runGamectlCli(
      [
        "--root",
        root,
        "--json",
        "scenario",
        "check",
        "scenarios/tooling.jsonc",
        "--registry",
        "scenarios/registry.json",
      ],
      captured.io,
    );

    expect(exit).toBe(1);
    const envelope = parseEnvelope(captured.stdout);
    expect(envelope.command).toBe("scenario.check");
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.code).toBe("scenario-invalid");
    expect(envelope.error?.diagnostics?.map(({ code }) => code)).toContain("SCN006");
  });

  it("compiles a deterministic artifact with resolved rules and numeric certificate budgets", async () => {
    const root = makeScenarioRepo();
    const first = captureIo();
    const second = captureIo();
    const arguments_ = [
      "--root",
      root,
      "--json",
      "scenario",
      "compile",
      "scenarios/tooling.jsonc",
      "--registry",
      "scenarios/registry.json",
    ] as const;

    expect(await runGamectlCli(arguments_, first.io)).toBe(0);
    expect(await runGamectlCli(arguments_, second.io)).toBe(0);

    const firstEnvelope = parseEnvelope(first.stdout);
    const secondEnvelope = parseEnvelope(second.stdout);
    expect(firstEnvelope.command).toBe("scenario.compile");
    expect(firstEnvelope.ok).toBe(true);
    expect(firstEnvelope.result).toEqual(secondEnvelope.result);

    const result = resultAs<{
      artifact: {
        schemaVersion: string;
        program: {
          schemaVersion: string;
          instructions: unknown[];
          sourceFingerprint: string;
          programFingerprint: string;
        };
        capabilities: { rulesFingerprint: string };
        certificate: {
          programFingerprint: string;
          rulesFingerprint: string;
          transitionBudgetMax: number;
          blockingDecisionsMin: number;
          blockingDecisionsMax: number;
          providerCallsMax: number;
          rngCallsMax: number;
          certificateFingerprint: string;
        };
      };
    }>(firstEnvelope);

    expect(result.artifact.schemaVersion).toBe("scenario-artifact-v1");
    expect(result.artifact.program.schemaVersion).toBe("scenario-program-v1");
    expect(result.artifact.program.instructions).toHaveLength(4);
    expect(result.artifact.program.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.artifact.program.programFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.artifact.capabilities.rulesFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.artifact.certificate).toMatchObject({
      programFingerprint: result.artifact.program.programFingerprint,
      rulesFingerprint: result.artifact.capabilities.rulesFingerprint,
      transitionBudgetMax: 4,
      blockingDecisionsMin: 0,
      blockingDecisionsMax: 0,
      providerCallsMax: 1,
      rngCallsMax: 3,
    });
    expect(result.artifact.certificate.certificateFingerprint).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("writes a raw artifact and inspects only its bounded execution evidence", async () => {
    const root = makeScenarioRepo();
    const compiled = captureIo();
    const artifactPath = "artifacts/tooling.scenario.json";
    const compileExit = await runGamectlCli(
      [
        "--root",
        root,
        "--json",
        "scenario",
        "compile",
        "scenarios/tooling.jsonc",
        "--registry",
        "scenarios/registry.json",
        "--out",
        artifactPath,
      ],
      compiled.io,
    );
    expect(compileExit).toBe(0);
    expect(fs.existsSync(path.join(root, artifactPath))).toBe(true);

    const artifact = JSON.parse(fs.readFileSync(path.join(root, artifactPath), "utf8")) as {
      schemaVersion: string;
    };
    expect(artifact.schemaVersion).toBe("scenario-artifact-v1");

    const inspected = captureIo();
    const inspectExit = await runGamectlCli(
      ["--root", root, "--json", "scenario", "inspect", artifactPath],
      inspected.io,
    );
    expect(inspectExit).toBe(0);
    const envelope = parseEnvelope(inspected.stdout);
    expect(envelope.command).toBe("scenario.inspect");
    const summary = resultAs<{
      scenarioId: string;
      instructionCount: number;
      blockingDecisionsMin: number;
      blockingDecisionsMax: number;
      transitionBudgetMax: number;
      providerCallsMax: number;
      rngCallsMax: number;
      sourceFingerprint: string;
      programFingerprint: string;
      rulesFingerprint: string;
      certificateFingerprint: string;
    }>(envelope);
    expect(summary).toMatchObject({
      scenarioId: "scenario.tooling",
      instructionCount: 4,
      blockingDecisionsMin: 0,
      blockingDecisionsMax: 0,
      transitionBudgetMax: 4,
      providerCallsMax: 1,
      rngCallsMax: 3,
    });
    for (const key of [
      "sourceFingerprint",
      "programFingerprint",
      "rulesFingerprint",
      "certificateFingerprint",
    ] as const) {
      expect(summary[key]).toMatch(/^[0-9a-f]{64}$/u);
    }
  });

  it("requires explicit paths for registry-backed check/compile and an artifact for inspect", async () => {
    const root = makeScenarioRepo();
    for (const arguments_ of [
      ["--root", root, "--json", "scenario", "check", "scenarios/tooling.jsonc"],
      ["--root", root, "--json", "scenario", "compile", "scenarios/tooling.jsonc"],
      ["--root", root, "--json", "scenario", "inspect"],
    ]) {
      const captured = captureIo();
      expect(await runGamectlCli(arguments_, captured.io)).toBe(2);
      expect(parseEnvelope(captured.stdout).error?.code).toBe("usage-error");
    }
  });
});
