import path from "node:path";
import { pathToFileURL } from "node:url";

import { runGamectlCli as runLegacyGamectlCli, type GamectlIo } from "./gamectl";

const ENVELOPE_SCHEMA = "runtime-human-gamectl-v1" as const;
const CAPABILITIES_SCHEMA = "runtime-human-gamectl-capabilities-v1" as const;

const IMPLEMENTED_COMMANDS = Object.freeze({
  capabilities: 1,
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
} as const);

function capabilityPositionals(argv: readonly string[]) {
  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json" || value === "--quiet") continue;
    if (value === "--root") {
      index += 1;
      if (index >= argv.length) return null;
      continue;
    }
    if (value.startsWith("-")) return null;
    positionals.push(value);
  }
  return positionals;
}

function capabilitiesResult() {
  return {
    schemaVersion: CAPABILITIES_SCHEMA,
    commands: IMPLEMENTED_COMMANDS,
    contracts: {
      transport: ENVELOPE_SCHEMA,
      diagnostic: "runtime-human-diagnostic-v1",
      simulationReport: "simulation-report-v1",
      gameplayFixture: "gameplay-fixture-v1",
      repro: "game-repro-v1",
    },
  };
}

function runCapabilities(argv: readonly string[], io: GamectlIo): number | null {
  const positionals = capabilityPositionals(argv);
  if (positionals === null || positionals[0] !== "capabilities") return null;
  const json = argv.includes("--json");
  if (positionals.length !== 1) {
    const message = "capabilities takes no positional arguments";
    io.stderr(`error: usage-error: ${message}`);
    if (json) {
      io.stdout(
        JSON.stringify(
          {
            schemaVersion: ENVELOPE_SCHEMA,
            command: "capabilities",
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

  const result = capabilitiesResult();
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: ENVELOPE_SCHEMA,
          command: "capabilities",
          ok: true,
          result,
        },
        null,
        2,
      ),
    );
  } else {
    io.stdout(`gamectl ${CAPABILITIES_SCHEMA}`);
    io.stdout(`commands: ${Object.keys(result.commands).join(", ")}`);
  }
  return 0;
}

export async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const capabilityExit = runCapabilities(argv, io);
  if (capabilityExit !== null) return capabilityExit;
  return runLegacyGamectlCli(argv, io);
}

async function main() {
  const io: GamectlIo = {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  };
  process.exitCode = await runGamectlCli(process.argv.slice(2), io);
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) await main();
