#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
const args = isWindows
  ? ["/d", "/s", "/c", "pnpm exec vitest run tests/materialize-january-e2-fixtures.test.ts"]
  : ["exec", "vitest", "run", "tests/materialize-january-e2-fixtures.test.ts"];
const result = spawnSync(command, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    RUNTIME_HUMAN_MATERIALIZE_JANUARY_E2: "1",
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
