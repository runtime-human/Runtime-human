#!/usr/bin/env node

import { startVitest } from "vitest/node";

const options = parseArguments(process.argv.slice(2));
process.env.RUNTIME_HUMAN_PERF_BASELINE = "1";
process.env.RUNTIME_HUMAN_PERF_WARMUPS = String(options.warmups);
process.env.RUNTIME_HUMAN_PERF_SAMPLES = String(options.samples);
process.env.RUNTIME_HUMAN_PERF_OUTPUT = options.output;
if (options.commit !== null) process.env.RUNTIME_HUMAN_PERF_COMMIT = options.commit;

const vitest = await startVitest("test", ["tests/january-1990-application-baseline.perf.test.ts"], {
  run: true,
  watch: false,
});

if (vitest === undefined) {
  throw new Error("Vitest could not start the January performance baseline");
}

const failedModules = [...vitest.state.getTestModules()].filter((module) => !module.ok());
await vitest.close();
if (failedModules.length > 0) process.exitCode = 1;

function parseArguments(args) {
  const result = {
    warmups: 5,
    samples: 30,
    output: "artifacts/performance/january-application-baseline.json",
    commit: null,
  };

  for (const argument of args) {
    if (argument === "--") continue;
    if (argument.startsWith("--warmups=")) {
      result.warmups = parseInteger(argument, "--warmups=", 0);
      continue;
    }
    if (argument.startsWith("--samples=")) {
      result.samples = parseInteger(argument, "--samples=", 1);
      continue;
    }
    if (argument.startsWith("--output=")) {
      result.output = requireValue(argument, "--output=");
      continue;
    }
    if (argument.startsWith("--commit=")) {
      result.commit = requireValue(argument, "--commit=");
      continue;
    }
    throw new Error(`Unknown January performance baseline option: ${argument}`);
  }
  return result;
}

function parseInteger(argument, prefix, minimum) {
  const value = Number(requireValue(argument, prefix));
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${prefix.slice(0, -1)} must be an integer >= ${minimum}`);
  }
  return value;
}

function requireValue(argument, prefix) {
  const value = argument.slice(prefix.length);
  if (value.length === 0) throw new Error(`${prefix.slice(0, -1)} requires a value`);
  return value;
}
