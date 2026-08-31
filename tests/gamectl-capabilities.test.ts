import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;
type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;

type Captured = Readonly<{
  stdout: string[];
  stderr: string[];
  io: GamectlIo;
}>;

const gamectlEntryUrl = new URL("../scripts/gamectl-entry.ts", import.meta.url).href;
const dependencyFreeEntry = fileURLToPath(
  new URL("../scripts/gamectl-capabilities.mjs", import.meta.url),
);
let gamectlEntryModule: Promise<GamectlCliModule> | undefined;

async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  gamectlEntryModule ??= import(gamectlEntryUrl) as Promise<GamectlCliModule>;
  const { runGamectlCli: runCli } = await gamectlEntryModule;
  return runCli(argv, io);
}

function capture(): Captured {
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

describe("gamectl capabilities", () => {
  it("discovers only commands implemented on the exact target", async () => {
    const captured = capture();
    const exit = await runGamectlCli(["--json", "capabilities"], captured.io);

    expect(exit).toBe(0);
    expect(captured.stderr).toEqual([]);
    const envelope = JSON.parse(captured.stdout.join("\n")) as {
      schemaVersion: string;
      command: string;
      ok: boolean;
      result: {
        schemaVersion: string;
        commands: Record<string, number>;
        contracts: Record<string, string>;
      };
    };
    expect(envelope.schemaVersion).toBe("runtime-human-gamectl-v1");
    expect(envelope.command).toBe("capabilities");
    expect(envelope.ok).toBe(true);
    expect(envelope.result.schemaVersion).toBe("runtime-human-gamectl-capabilities-v1");
    expect(envelope.result.commands.capabilities).toBe(1);
    expect(envelope.result.commands).toMatchObject({
      doctor: 1,
      "catalog.list": 1,
      "catalog.show": 1,
      "catalog.refs": 1,
      "catalog.impact": 1,
      "content.validate": 1,
      "content.source": 1,
      "simulate.run": 1,
      "simulate.compare": 1,
      "fixture.list": 1,
      "fixture.materialize": 1,
      replay: 1,
      explain: 1,
    });
    expect(envelope.result.commands["catalog.inspect"]).toBeUndefined();
    expect(envelope.result.commands["schema.show"]).toBeUndefined();
    expect(envelope.result.contracts.diagnostic).toBe("runtime-human-diagnostic-v1");
  });

  it("runs capability discovery directly under node without target dependencies", () => {
    const stdout = execFileSync(
      process.execPath,
      [dependencyFreeEntry, "capabilities", "--json"],
      { encoding: "utf8" },
    );
    const envelope = JSON.parse(stdout) as {
      schemaVersion: string;
      command: string;
      ok: boolean;
      result: { schemaVersion: string; commands: Record<string, number> };
    };

    expect(envelope).toMatchObject({
      schemaVersion: "runtime-human-gamectl-v1",
      command: "capabilities",
      ok: true,
      result: { schemaVersion: "runtime-human-gamectl-capabilities-v1" },
    });
    expect(envelope.result.commands.capabilities).toBe(1);
  });
});
