import path from "node:path";
import { pathToFileURL } from "node:url";

import { runGamectlCapabilities } from "./gamectl-capabilities.mjs";
import { runGamectlCli as runLegacyGamectlCli, type GamectlIo } from "./gamectl";

export async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const capabilityExit = runGamectlCapabilities(argv, io);
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
