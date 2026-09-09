import { describe, expect, it } from "vitest";

import { JANUARY_1990_SCENARIO_ARTIFACT } from "@runtime-human/game-content";

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;

type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;

const gamectlModuleUrl = new URL("../scripts/gamectl.ts", import.meta.url).href;

async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const module = (await import(gamectlModuleUrl)) as GamectlCliModule;
  return module.runGamectlCli(argv, io);
}

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

describe("ENGINE-03 canonical gamectl corpus", () => {
  it("runs the closed January corpus and emits authoritative v4 identity", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["simulate", "run", "--corpus", "january-1990-canonical-v1", "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.err).toEqual([]);

    const envelope = JSON.parse(io.out.join("\n")) as {
      schemaVersion: string;
      command: string;
      ok: boolean;
      result: {
        corpusId: string;
        report: {
          schemaVersion: string;
          runs: number;
          seedRange: { start: number; end: number };
          policies: string[];
          invariantFailures: unknown[];
          corpus: { schemaVersion: string; corpusId: string; fingerprint: string };
          scenario: {
            scenarioId: string;
            programFingerprint: string;
            certificateFingerprint: string;
          };
        };
      };
    };

    expect(envelope.schemaVersion).toBe("runtime-human-gamectl-v1");
    expect(envelope.command).toBe("simulate.run");
    expect(envelope.ok).toBe(true);
    expect(envelope.result.corpusId).toBe("january-1990-canonical-v1");
    expect(envelope.result.report.schemaVersion).toBe("simulation-report-v4");
    expect(envelope.result.report.runs).toBe(192);
    expect(envelope.result.report.seedRange).toEqual({ start: 1, end: 64 });
    expect(envelope.result.report.policies).toHaveLength(3);
    expect(envelope.result.report.invariantFailures).toEqual([]);
    expect(envelope.result.report.corpus).toMatchObject({
      schemaVersion: "simulation-corpus-v1",
      corpusId: "january-1990-canonical-v1",
    });
    expect(envelope.result.report.corpus.fingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(envelope.result.report.scenario).toEqual({
      scenarioId: JANUARY_1990_SCENARIO_ARTIFACT.program.scenarioId,
      programFingerprint: JANUARY_1990_SCENARIO_ARTIFACT.program.programFingerprint,
      certificateFingerprint: JANUARY_1990_SCENARIO_ARTIFACT.certificate.certificateFingerprint,
    });
  });

  it("runs the closed January smoke corpus as a strict bounded subset", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["simulate", "run", "--corpus", "january-1990-smoke-v1", "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.err).toEqual([]);

    const envelope = JSON.parse(io.out.join("\n")) as {
      result: {
        corpusId: string;
        report: {
          schemaVersion: string;
          runs: number;
          seedRange: { start: number; end: number };
          policies: string[];
          invariantFailures: unknown[];
          corpus: { schemaVersion: string; corpusId: string; fingerprint: string };
        };
      };
    };

    expect(envelope.result.corpusId).toBe("january-1990-smoke-v1");
    expect(envelope.result.report.schemaVersion).toBe("simulation-report-v4");
    expect(envelope.result.report.runs).toBe(12);
    expect(envelope.result.report.seedRange).toEqual({ start: 1, end: 4 });
    expect(envelope.result.report.policies).toHaveLength(3);
    expect(envelope.result.report.invariantFailures).toEqual([]);
    expect(envelope.result.report.corpus).toMatchObject({
      schemaVersion: "simulation-corpus-v1",
      corpusId: "january-1990-smoke-v1",
    });
    expect(envelope.result.report.corpus.fingerprint).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("rejects canonical corpus overrides instead of silently changing the contract", async () => {
    for (const corpusId of ["january-1990-canonical-v1", "january-1990-smoke-v1"] as const) {
      for (const override of [
        ["--seeds", "1..2"],
        ["--policies", "all"],
        ["--fixture", "january-start"],
      ] as const) {
        const io = collectIo();
        const exitCode = await runGamectlCli(
          ["simulate", "run", "--corpus", corpusId, ...override, "--json"],
          io,
        );
        expect(exitCode).toBe(2);
        const envelope = JSON.parse(io.out.join("\n")) as { error: { code: string } };
        expect(envelope.error.code).toBe("invalid-filter");
      }
    }
  });

  it("fails closed for an unknown corpus id", async () => {
    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["simulate", "run", "--corpus", "january-1990-unknown-v1", "--json"],
      io,
    );
    expect(exitCode).toBe(2);
    const envelope = JSON.parse(io.out.join("\n")) as { error: { code: string } };
    expect(envelope.error.code).toBe("invalid-filter");
  });
});
