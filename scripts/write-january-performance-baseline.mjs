#!/usr/bin/env node

import { startVitest } from "vitest/node";

process.env.RUNTIME_HUMAN_MATERIALIZE_JANUARY_PERFORMANCE = "1";

const vitest = await startVitest(
  "test",
  ["tests/materialize-january-performance-baseline.test.ts"],
  {
    run: true,
    watch: false,
  },
);

if (vitest === undefined) {
  throw new Error("Vitest could not start the January performance baseline");
}

const failedModules = [...vitest.state.getTestModules()].filter((module) => !module.ok());
await vitest.close();
if (failedModules.length > 0) process.exitCode = 1;
