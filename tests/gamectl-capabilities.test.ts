import { describe, expect, it } from "vitest";

import { runGamectlCli } from "../scripts/gamectl";

type Captured = Readonly<{
  stdout: string[];
  stderr: string[];
  io: Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;
}>;

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
});
