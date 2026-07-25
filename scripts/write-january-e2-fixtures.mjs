#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  command,
  ["exec", "vitest", "run", "tests/materialize-january-e2-fixtures.test.ts"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RUNTIME_HUMAN_MATERIALIZE_JANUARY_E2: "1",
    },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
