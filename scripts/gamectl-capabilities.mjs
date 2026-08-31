import path from "node:path";
import { pathToFileURL } from "node:url";

export const GAMECTL_ENVELOPE_SCHEMA = "runtime-human-gamectl-v1";
export const GAMECTL_CAPABILITIES_SCHEMA = "runtime-human-gamectl-capabilities-v1";

export const IMPLEMENTED_GAMECTL_COMMANDS = Object.freeze({
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
});

function capabilityPositionals(argv) {
  const positionals = [];
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

export function gamectlCapabilitiesResult() {
  return {
    schemaVersion: GAMECTL_CAPABILITIES_SCHEMA,
    commands: IMPLEMENTED_GAMECTL_COMMANDS,
    contracts: {
      transport: GAMECTL_ENVELOPE_SCHEMA,
      diagnostic: "runtime-human-diagnostic-v1",
      simulationReport: "simulation-report-v1",
      gameplayFixture: "gameplay-fixture-v1",
      repro: "game-repro-v1",
    },
  };
}

export function runGamectlCapabilities(argv, io) {
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
            schemaVersion: GAMECTL_ENVELOPE_SCHEMA,
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

  const result = gamectlCapabilitiesResult();
  if (json) {
    io.stdout(
      JSON.stringify(
        {
          schemaVersion: GAMECTL_ENVELOPE_SCHEMA,
          command: "capabilities",
          ok: true,
          result,
        },
        null,
        2,
      ),
    );
  } else {
    io.stdout(`gamectl ${GAMECTL_CAPABILITIES_SCHEMA}`);
    io.stdout(`commands: ${Object.keys(result.commands).join(", ")}`);
  }
  return 0;
}

function main() {
  const io = {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  };
  const exit = runGamectlCapabilities(process.argv.slice(2), io);
  if (exit === null) {
    console.error("error: usage-error: dependency-free entry supports capabilities only");
    process.exitCode = 2;
    return;
  }
  process.exitCode = exit;
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) main();
