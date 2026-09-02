import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runGamectlCli as runCoreGamectlCli, type GamectlIo } from "./gamectl-core";
import { runScenarioGamectlCli } from "./gamectl-scenario";

export type { GamectlIo } from "./gamectl-core";

export async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const scenarioExit = await runScenarioGamectlCli(argv, io);
  if (scenarioExit !== null) return scenarioExit;
  return runCoreGamectlCli(argv, io);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await runGamectlCli(process.argv.slice(2), {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}
