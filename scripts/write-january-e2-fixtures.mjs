#!/usr/bin/env node

import { startVitest } from "vitest/node";

process.env.RUNTIME_HUMAN_MATERIALIZE_JANUARY_E2 = "1";

const vitest = await startVitest(
  "test",
  ["tests/materialize-january-e2-fixtures.test.ts"],
  {
    run: true,
    watch: false,
  },
);

if (vitest === undefined) {
  throw new Error("Vitest could not start the January E2 evidence materializer");
}

const failedModules = [...vitest.state.getTestModules()].filter((module) => !module.ok());
if (failedModules.length > 0) {
  process.exitCode = 1;
}
