import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
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
