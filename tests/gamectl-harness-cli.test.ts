import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;

type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;

const gamectlModuleUrl = new URL("../scripts/gamectl.ts", import.meta.url).href;

async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const module = (await import(gamectlModuleUrl)) as GamectlCliModule;
  return module.runGamectlCli(argv, io);
}

const repositoryRoot = path.resolve(import.meta.dirname, "..");

function collectIo(): GamectlIo & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  };
}

type Envelope = Readonly<{
  schemaVersion: string;
  command: string;
  ok: boolean;
  result?: Record<string, unknown>;
  error?: { code: string; message: string };
}>;

async function parseEnvelope(io: GamectlIo & { out: string[] }): Promise<Envelope> {
  return JSON.parse(io.out.join("\n")) as Envelope;
}

const tempDirectories: string[] = [];

async function createTempRoot(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rh-gamectl-"));
  tempDirectories.push(directory);
  return directory;
}

async function copyHarnessEnvironment(root: string): Promise<void> {
  await mkdir(path.join(root, "fixtures", "gameplay"), { recursive: true });
  await cp(
    path.join(repositoryRoot, "apps", "desktop", "public", "content"),
    path.join(root, "apps", "desktop", "public", "content"),
    { recursive: true },
  );
  await cp(path.join(repositoryRoot, "balance"), path.join(root, "balance"), { recursive: true });
}

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
});

describe("gamectl explain", () => {
  it("explains an explicit January outcome", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      [
        "explain",
        "--outcome",
        "january-1990",
        "--access",
        "home-pc",
        "--learning",
        "edit-and-debug",
        "--response",
        "inspect-listing",
        "--roll",
        "1",
        "--json",
      ],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    expect(envelope.command).toBe("explain");
    expect(envelope.ok).toBe(true);
    const explanation = envelope.result?.explanation as {
      schemaVersion: string;
      ruleVersion: string;
      result: { clarity: number; correctness: number; reliability: number };
      contributions: { reasonCode: string; clarity?: number }[];
    };
    expect(explanation.schemaVersion).toBe("quality-explain-v1");
    expect(explanation.ruleVersion).toBe("january-quality-v1");
    expect(explanation.result).toEqual({ clarity: 9, correctness: 10, reliability: 7 });
    expect(explanation.contributions).toHaveLength(5);
  });

  it("explains the outcome of a reproduced repro", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["explain", "--repro", "fixtures/repro/january-1990-first-program.repro.json", "--json"],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    const explanation = envelope.result?.explanation as {
      inputs: { access: string; learning: string; response: string; roll: number };
      result: { clarity: number };
    };
    expect(explanation.inputs).toEqual({
      access: "home-pc",
      learning: "read-and-run",
      response: "inspect-listing",
      roll: 0,
    });
    expect(explanation.result.clarity).toBe(7);
  });

  it("rejects incomplete inputs and conflicting modes", async () => {
    const missing = collectIo();
    const missingExit = await runGamectlCli(
      ["explain", "--outcome", "january-1990", "--access", "home-pc", "--json"],
      missing,
    );
    expect(missingExit).toBe(2);
    const missingEnvelope = await parseEnvelope(missing);
    expect(missingEnvelope.error?.code).toBe("explain-input-missing");

    const conflicting = collectIo();
    const conflictingExit = await runGamectlCli(
      ["explain", "--outcome", "january-1990", "--repro", "x.repro.json", "--json"],
      conflicting,
    );
    expect(conflictingExit).toBe(2);
    const conflictingEnvelope = await parseEnvelope(conflicting);
    expect(conflictingEnvelope.error?.code).toBe("usage-error");

    const invalidRoll = collectIo();
    const invalidRollExit = await runGamectlCli(
      [
        "explain",
        "--outcome",
        "january-1990",
        "--access",
        "home-pc",
        "--learning",
        "read-and-run",
        "--response",
        "inspect-listing",
        "--roll",
        "9",
        "--json",
      ],
      invalidRoll,
    );
    expect(invalidRollExit).toBe(2);
    const invalidRollEnvelope = await parseEnvelope(invalidRoll);
    expect(invalidRollEnvelope.error?.code).toBe("explain-input-invalid");
  });
});

describe("gamectl simulate compare", () => {
  async function writeReport(name: string, mutate: (report: Record<string, unknown>) => unknown) {
    const directory = await createTempRoot();
    const source = await runSimulateJson();
    const mutated = mutate(source);
    const target = path.join(directory, name);
    await writeFile(target, JSON.stringify(mutated), "utf8");
    return target;
  }

  async function runSimulateJson(): Promise<Record<string, unknown>> {
    const io = collectIo();
    const exitCode = await runGamectlCli(["simulate", "run", "--seeds", "1..4", "--json"], io);
    expect(exitCode).toBe(0);
    return JSON.parse(io.out.join("\n")) as Record<string, unknown>;
  }

  it("reports unchanged dispositions for identical reports", async () => {
    const target = await writeReport("candidate.json", (envelope) => envelope);
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["simulate", "compare", "--base", target, "--candidate", target, "--json"],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    const report = envelope.result as {
      schemaVersion: string;
      regressionCount: number;
      metrics: {
        metric: string;
        baseline: number;
        candidate: number;
        delta: number;
        threshold: number | null;
        disposition: string;
      }[];
    };
    expect(report.schemaVersion).toBe("simulation-compare-v1");
    expect(report.regressionCount).toBe(0);
    expect(report.metrics).toHaveLength(13);
    expect(report.metrics.every((row) => row.disposition === "unchanged")).toBe(true);
  });

  it("reports regressions and honors warning budgets", async () => {
    const directory = await createTempRoot();
    const baseEnvelope = await runSimulateJson();
    const candidateEnvelope = structuredClone(baseEnvelope);
    const candidateReport = (candidateEnvelope as { result: { report: Record<string, unknown> } })
      .result.report;
    const candidateAggregates = candidateReport.aggregates as Record<string, unknown>;
    candidateAggregates.softLocks = 2;
    candidateAggregates.completedRuns = 11;
    const basePath = path.join(directory, "base.json");
    const candidatePath = path.join(directory, "candidate.json");
    await writeFile(basePath, JSON.stringify(baseEnvelope), "utf8");
    await writeFile(candidatePath, JSON.stringify(candidateEnvelope), "utf8");

    const regressed = collectIo();
    const regressedExit = await runGamectlCli(
      ["simulate", "compare", "--base", basePath, "--candidate", candidatePath, "--json"],
      regressed,
    );
    expect(regressedExit).toBe(1);
    const regressedEnvelope = await parseEnvelope(regressed);
    const regressedReport = regressedEnvelope.result as {
      regressionCount: number;
      metrics: { metric: string; disposition: string }[];
    };
    expect(regressedEnvelope.ok).toBe(false);
    expect(regressedReport.regressionCount).toBe(2);
    const softLockRow = regressedReport.metrics.find((row) => row.metric === "softLocks");
    expect(softLockRow?.disposition).toBe("regression");

    const budgeted = collectIo();
    const budgetedExit = await runGamectlCli(
      [
        "simulate",
        "compare",
        "--base",
        basePath,
        "--candidate",
        candidatePath,
        "--threshold",
        "softLocks=2",
        "--json",
      ],
      budgeted,
    );
    expect(budgetedExit).toBe(1);
    const budgetedEnvelope = await parseEnvelope(budgeted);
    const budgetedReport = budgetedEnvelope.result as {
      regressionCount: number;
      metrics: { metric: string; disposition: string }[];
    };
    expect(budgetedReport.regressionCount).toBe(1);
    const budgetedSoftLocks = budgetedReport.metrics.find((row) => row.metric === "softLocks");
    expect(budgetedSoftLocks?.disposition).toBe("within-budget");
  });

  it("rejects invalid input and incompatible reports", async () => {
    const directory = await createTempRoot();
    const missing = collectIo();
    const missingExit = await runGamectlCli(
      [
        "simulate",
        "compare",
        "--base",
        path.join(directory, "nope.json"),
        "--candidate",
        path.join(directory, "nope.json"),
        "--json",
      ],
      missing,
    );
    expect(missingExit).toBe(2);
    expect((await parseEnvelope(missing)).error?.code).toBe("report-not-found");

    const brokenPath = path.join(directory, "broken.json");
    await writeFile(brokenPath, JSON.stringify({ schemaVersion: "simulation-report-v1" }), "utf8");
    const broken = collectIo();
    const brokenExit = await runGamectlCli(
      ["simulate", "compare", "--base", brokenPath, "--candidate", brokenPath, "--json"],
      broken,
    );
    expect(brokenExit).toBe(2);
    expect((await parseEnvelope(broken)).error?.code).toBe("report-invalid");

    const baseEnvelope = await runSimulateJson();
    const foreignEnvelope = structuredClone(baseEnvelope);
    const foreignReport = (foreignEnvelope as { result: { report: Record<string, unknown> } })
      .result.report;
    foreignReport.rulesetFingerprint = "a".repeat(64);
    const basePath = path.join(directory, "base.json");
    const foreignPath = path.join(directory, "foreign.json");
    await writeFile(basePath, JSON.stringify(baseEnvelope), "utf8");
    await writeFile(foreignPath, JSON.stringify(foreignEnvelope), "utf8");
    const incompatible = collectIo();
    const incompatibleExit = await runGamectlCli(
      ["simulate", "compare", "--base", basePath, "--candidate", foreignPath, "--json"],
      incompatible,
    );
    expect(incompatibleExit).toBe(3);
    expect((await parseEnvelope(incompatible)).error?.code).toBe("compare-incompatible");

    const badThreshold = collectIo();
    const badThresholdExit = await runGamectlCli(
      [
        "simulate",
        "compare",
        "--base",
        basePath,
        "--candidate",
        basePath,
        "--threshold",
        "madeUp=1",
        "--json",
      ],
      badThreshold,
    );
    expect(badThresholdExit).toBe(2);
    expect((await parseEnvelope(badThreshold)).error?.code).toBe("invalid-filter");
  });
});

describe("gamectl fixture", () => {
  it("lists committed gameplay fixtures", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(["fixture", "list", "--json"], io);
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    const result = envelope.result as {
      count: number;
      fixtures: { id: string; slice: string; seed: number; path: string }[];
    };
    expect(result.count).toBeGreaterThanOrEqual(1);
    const januaryStart = result.fixtures.find((fixture) => fixture.id === "january-start");
    expect(januaryStart).toMatchObject({ slice: "january-1990", seed: 42 });
  });

  it("reports invalid fixture files as a semantic failure", async () => {
    const root = await createTempRoot();
    await mkdir(path.join(root, "fixtures", "gameplay"), { recursive: true });
    await writeFile(
      path.join(root, "fixtures", "gameplay", "january-start.jsonc"),
      JSON.stringify({
        schemaVersion: "gameplay-fixture-v2",
        id: "january-start",
        slice: "january-1990",
        seed: 42,
        answers: {},
      }),
      "utf8",
    );
    const io = collectIo();
    const exitCode = await runGamectlCli(["fixture", "list", "--root", root, "--json"], io);
    expect(exitCode).toBe(1);
    const envelope = await parseEnvelope(io);
    expect(envelope.error?.code).toBe("fixture-invalid");
    expect(envelope.error?.message).toContain("january-start.jsonc");
  });

  it("materializes a fixture summary for every policy", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(["fixture", "materialize", "january-start", "--json"], io);
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    const result = envelope.result as {
      fixtureId: string;
      runs: {
        seed: string;
        policyId: string;
        terminalState: string;
        qualityScores: { clarity: number | null } | null;
      }[];
    };
    expect(result.fixtureId).toBe("january-start");
    expect(result.runs).toHaveLength(3);
    expect(result.runs.every((run) => run.terminalState === "completed")).toBe(true);
    expect(result.runs.every((run) => run.qualityScores !== null)).toBe(true);
  });

  it("materializes explicit fixture answers and a single policy", async () => {
    const root = await createTempRoot();
    await copyHarnessEnvironment(root);
    await mkdir(path.join(root, "fixtures", "gameplay"), { recursive: true });
    await writeFile(
      path.join(root, "fixtures", "gameplay", "january-intent.jsonc"),
      `{
  // intent-only fixture copied for a temp-root materialization check
  "schemaVersion": "gameplay-fixture-v1",
  "id": "january-intent",
  "slice": "january-1990",
  "seed": 42,
  "answers": {
    "access": "home-pc",
    "learning": "read-and-run",
    "response": "inspect-listing"
  }
}
`,
      "utf8",
    );
    const io = collectIo();
    const exitCode = await runGamectlCli(
      [
        "fixture",
        "materialize",
        "january-intent",
        "--policy",
        "learning-first",
        "--root",
        root,
        "--json",
      ],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    const result = envelope.result as {
      runs: { policyId: string; qualityScores: { clarity: number } | null }[];
    };
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.policyId).toBe("learning-first");
    expect(result.runs[0]?.qualityScores?.clarity).toBe(7);
  });

  it("rejects unknown and broken fixtures", async () => {
    const unknown = collectIo();
    expect(await runGamectlCli(["fixture", "materialize", "nope", "--json"], unknown)).toBe(2);
    expect((await parseEnvelope(unknown)).error?.code).toBe("fixture-not-found");
  });
});

describe("gamectl replay --trace", () => {
  it("emits a decision and materialization trace", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["replay", "fixtures/repro/january-1990-first-program.repro.json", "--trace", "--json"],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    const result = envelope.result as {
      kind: string;
      trace: {
        schemaVersion: string;
        terminalState: string;
        decisions: { index: number; decisionId: string }[];
        materializedQualityScores: { clarity: number } | null;
      };
    };
    expect(result.kind).toBe("reproduced");
    expect(result.trace.schemaVersion).toBe("game-replay-trace-v1");
    expect(result.trace.terminalState).toBe("completed");
    expect(result.trace.decisions.map((decision) => decision.decisionId)).toEqual([
      "january-1990/access",
      "january-1990/learning",
      "january-1990/defect",
    ]);
    expect(result.trace.materializedQualityScores?.clarity).toBe(7);
  });

  it("keeps the trace out of the default output", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["replay", "fixtures/repro/january-1990-first-program.repro.json", "--json"],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = await parseEnvelope(io);
    expect(envelope.result).not.toHaveProperty("trace");
  });

  it("prints a human trace without --json", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["replay", "fixtures/repro/january-1990-first-program.repro.json", "--trace"],
      io,
    );
    expect(exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("trace game-replay-trace-v1");
    expect(io.out.join("\n")).toContain("decision[0] january-1990/access -> home-pc");
    expect(io.out.join("\n")).toContain("materialized scores: clarity=7");
  });
});
