import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;

type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;

type JsonObject = Record<string, unknown>;

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

async function writeTempRepro(
  directory: string,
  name: string,
  mutate: (repro: Record<string, unknown>) => Record<string, unknown>,
): Promise<string> {
  const source = await readFile(
    path.join(repositoryRoot, "fixtures", "repro", "january-1990-first-program.repro.json"),
    "utf8",
  );
  const repro = mutate(JSON.parse(source) as Record<string, unknown>);
  const target = path.join(directory, name);
  await writeFile(target, JSON.stringify(repro, null, 2), "utf8");
  return target;
}

async function writeTempJson(directory: string, name: string, value: unknown): Promise<string> {
  const target = path.join(directory, name);
  await writeFile(target, JSON.stringify(value, null, 2), "utf8");
  return target;
}

function requireObject(value: unknown, name: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as JsonObject;
}

function envelopeReport(envelope: JsonObject): JsonObject {
  const result = requireObject(envelope.result, "gamectl result");
  return requireObject(result.report, "gamectl simulation report");
}

async function runJson(
  argv: readonly string[],
): Promise<Readonly<{ exitCode: number; envelope: JsonObject }>> {
  const io = collectIo();
  const exitCode = await runGamectlCli([...argv, "--json"], io);
  return {
    exitCode,
    envelope: JSON.parse(io.out.join("\n")) as JsonObject,
  };
}

const tempDirectories: string[] = [];
let canonicalV4Envelope: JsonObject;

beforeAll(async () => {
  const result = await runJson(["simulate", "run", "--corpus", "january-1990-canonical-v1"]);
  expect(result.exitCode).toBe(0);
  canonicalV4Envelope = result.envelope;
});

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
});

afterAll(() => {
  canonicalV4Envelope = {};
});

describe("gamectl simulate and replay commands", () => {
  it("simulates a seed range with the versioned envelope", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(["simulate", "run", "--seeds", "1..4", "--json"], io);
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(io.out.join("\n")) as {
      schemaVersion: string;
      command: string;
      ok: boolean;
      result: { report: { runs: number; schemaVersion: string } };
    };
    expect(envelope.schemaVersion).toBe("runtime-human-gamectl-v1");
    expect(envelope.command).toBe("simulate.run");
    expect(envelope.ok).toBe(true);
    expect(envelope.result.report.runs).toBe(12);
    expect(envelope.result.report.schemaVersion).toBe("simulation-report-v1");
  });

  it("simulates from a gameplay fixture", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["simulate", "run", "--fixture", "january-start", "--json"],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(io.out.join("\n")) as {
      result: { fixtureId: string; report: { runs: number; seedRange: { start: number } } };
    };
    expect(envelope.result.fixtureId).toBe("january-start");
    expect(envelope.result.report.runs).toBe(3);
    expect(envelope.result.report.seedRange.start).toBe(42);
  });

  it("rejects an invalid seed range as invalid CLI input", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(["simulate", "run", "--seeds", "bogus", "--json"], io);
    expect(exitCode).toBe(2);
    const envelope = JSON.parse(io.out.join("\n")) as { error: { code: string } };
    expect(envelope.error.code).toBe("invalid-filter");
  });

  it("rejects an unknown policy as invalid CLI input", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["simulate", "run", "--seeds", "1..2", "--policies", "speedrunner", "--json"],
      io,
    );
    expect(exitCode).toBe(2);
  });

  it("compares wrapped canonical v4 reports with SimulationDiffV1", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-v4-"));
    tempDirectories.push(directory);
    const baseline = await writeTempJson(directory, "baseline.json", canonicalV4Envelope);
    const candidate = await writeTempJson(directory, "candidate.json", canonicalV4Envelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.envelope.ok).toBe(true);
    expect(result.envelope.command).toBe("simulate.compare");
    const diff = requireObject(result.envelope.result, "simulation diff");
    expect(diff.schemaVersion).toBe("simulation-diff-v1");
    expect(diff.verdict).toBe("pass");
  });

  it("compares raw and wrapped v4 reports without gating fingerprint drift", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-v4-"));
    tempDirectories.push(directory);
    const baseline = await writeTempJson(
      directory,
      "baseline.json",
      envelopeReport(canonicalV4Envelope),
    );
    const candidateEnvelope = structuredClone(canonicalV4Envelope);
    const candidateReport = envelopeReport(candidateEnvelope);
    candidateReport.rulesetFingerprint = "f".repeat(64);
    const candidate = await writeTempJson(directory, "candidate.json", candidateEnvelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.envelope.ok).toBe(true);
    const diff = requireObject(result.envelope.result, "simulation diff");
    expect(diff.verdict).toBe("pass-with-changes");
    expect(diff.fingerprintChanges).toEqual([
      expect.objectContaining({ key: "rulesetFingerprint" }),
    ]);
  });

  it("returns exit 1 and preserves the v4 diff for hard invariant regressions", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-v4-"));
    tempDirectories.push(directory);
    const candidateEnvelope = structuredClone(canonicalV4Envelope);
    const candidateReport = envelopeReport(candidateEnvelope);
    const aggregates = requireObject(candidateReport.aggregates, "simulation aggregates");
    aggregates.completedRuns = Number(candidateReport.runs) - 1;
    aggregates.softLocks = 1;
    const baseline = await writeTempJson(directory, "baseline.json", canonicalV4Envelope);
    const candidate = await writeTempJson(directory, "candidate.json", candidateEnvelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.envelope.ok).toBe(false);
    const diff = requireObject(result.envelope.result, "simulation diff");
    expect(diff.verdict).toBe("fail");
    expect(diff.hardInvariantChanges).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "softLocks", candidate: 1 })]),
    );
  });

  it("rejects thresholds for v4 comparison", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-v4-"));
    tempDirectories.push(directory);
    const baseline = await writeTempJson(directory, "baseline.json", canonicalV4Envelope);
    const candidate = await writeTempJson(directory, "candidate.json", canonicalV4Envelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
      "--threshold",
      "stateTransitions=1",
    ]);

    expect(result.exitCode).toBe(2);
    const error = requireObject(result.envelope.error, "gamectl error");
    expect(error.code).toBe("invalid-filter");
  });

  it("fails closed when v1 and v4 reports are mixed", async () => {
    const legacy = await runJson(["simulate", "run", "--seeds", "1..1"]);
    expect(legacy.exitCode).toBe(0);
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-mixed-"));
    tempDirectories.push(directory);
    const baseline = await writeTempJson(directory, "baseline.json", legacy.envelope);
    const candidate = await writeTempJson(directory, "candidate.json", canonicalV4Envelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
    ]);

    expect(result.exitCode).toBe(3);
    const error = requireObject(result.envelope.error, "gamectl error");
    expect(error.code).toBe("compare-incompatible");
  });

  it("rejects malformed v4 reports at the file boundary", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-v4-"));
    tempDirectories.push(directory);
    const malformedEnvelope = structuredClone(canonicalV4Envelope);
    envelopeReport(malformedEnvelope).extra = true;
    const baseline = await writeTempJson(directory, "baseline.json", malformedEnvelope);
    const candidate = await writeTempJson(directory, "candidate.json", canonicalV4Envelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
    ]);

    expect(result.exitCode).toBe(2);
    const error = requireObject(result.envelope.error, "gamectl error");
    expect(error.code).toBe("report-invalid");
  });

  it("preserves legacy v1 compare behavior", async () => {
    const legacy = await runJson(["simulate", "run", "--seeds", "1..1"]);
    expect(legacy.exitCode).toBe(0);
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-sim-v1-"));
    tempDirectories.push(directory);
    const baseline = await writeTempJson(directory, "baseline.json", legacy.envelope);
    const candidate = await writeTempJson(directory, "candidate.json", legacy.envelope);

    const result = await runJson([
      "simulate",
      "compare",
      "--base",
      baseline,
      "--candidate",
      candidate,
      "--threshold",
      "softLocks=0",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.envelope.ok).toBe(true);
    const report = requireObject(result.envelope.result, "legacy compare report");
    expect(report.schemaVersion).toBe("simulation-compare-v1");
  });

  it("reproduces the committed January repro", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["replay", "fixtures/repro/january-1990-first-program.repro.json", "--json"],
      io,
    );
    expect(exitCode).toBe(0);
    const envelope = JSON.parse(io.out.join("\n")) as {
      result: { kind: string; terminalCheckpointHash: string };
    };
    expect(envelope.result.kind).toBe("reproduced");
    expect(envelope.result.terminalCheckpointHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("reports a corrupted expectation as not reproduced", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-repro-"));
    tempDirectories.push(directory);
    const target = await writeTempRepro(directory, "corrupted.repro.json", (repro) => ({
      ...repro,
      expected: {
        kind: "success",
        terminalCheckpointHash: "0".repeat(64),
      },
    }));
    const io = collectIo();
    const exitCode = await runGamectlCli(["replay", target, "--json"], io);
    expect(exitCode).toBe(1);
    const envelope = JSON.parse(io.out.join("\n")) as { error: { code: string } };
    expect(envelope.error.code).toBe("repro-not-reproduced");
  });

  it("reports a foreign ruleset fingerprint as incompatible", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-repro-"));
    tempDirectories.push(directory);
    const target = await writeTempRepro(directory, "foreign.repro.json", (repro) => ({
      ...repro,
      rulesetFingerprint: "a".repeat(64),
    }));
    const io = collectIo();
    const exitCode = await runGamectlCli(["replay", target, "--json"], io);
    expect(exitCode).toBe(3);
    const envelope = JSON.parse(io.out.join("\n")) as { error: { code: string } };
    expect(envelope.error.code).toBe("repro-incompatible");
  });

  it("rejects an invalid repro contract", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-repro-"));
    tempDirectories.push(directory);
    const target = await writeTempRepro(directory, "invalid.repro.json", (repro) => ({
      ...repro,
      schemaVersion: "game-repro-v2",
    }));
    const io = collectIo();
    const exitCode = await runGamectlCli(["replay", target, "--json"], io);
    expect(exitCode).toBe(2);
    const envelope = JSON.parse(io.out.join("\n")) as { error: { code: string } };
    expect(envelope.error.code).toBe("repro-invalid");
  });
});
