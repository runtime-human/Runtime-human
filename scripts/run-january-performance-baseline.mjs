#!/usr/bin/env node

import { startVitest } from "vitest/node";

import { parseBaselineArguments } from "./performance/baseline-cli.mjs";

const options = parseBaselineArguments(
  process.argv.slice(2),
  {
    warmups: 5,
    samples: 30,
    output: "artifacts/performance/january-application-baseline.json",
  },
  "January application performance baseline",
);
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
