#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { arch, cpus, release, totalmem } from "node:os";
import { resolve } from "node:path";

const options = parseArguments(process.argv.slice(2));
const cpu = cpus()[0];
const cargo = process.platform === "win32" ? "cargo.exe" : "cargo";
const result = spawnSync(
  cargo,
  [
    "test",
    "--locked",
    "--manifest-path",
    "apps/desktop/src-tauri/Cargo.toml",
    "january_sqlite_performance_baseline",
    "--",
    "--nocapture",
    "--test-threads=1",
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RUNTIME_HUMAN_SQLITE_PERF_BASELINE: "1",
      RUNTIME_HUMAN_SQLITE_PERF_WARMUPS: String(options.warmups),
      RUNTIME_HUMAN_SQLITE_PERF_SAMPLES: String(options.samples),
      RUNTIME_HUMAN_SQLITE_PERF_OUTPUT: resolve(options.output),
      RUNTIME_HUMAN_PERF_COMMIT:
        options.commit ?? process.env.GITHUB_SHA ?? "unrecorded",
      RUNTIME_HUMAN_PERF_OS_RELEASE: release(),
      RUNTIME_HUMAN_PERF_CPU_MODEL: cpu?.model ?? "unknown",
      RUNTIME_HUMAN_PERF_LOGICAL_CORES: String(cpus().length),
      RUNTIME_HUMAN_PERF_TOTAL_MEMORY_MIB: String(
        Math.round(totalmem() / 1024 / 1024),
      ),
      RUNTIME_HUMAN_PERF_NODE_VERSION: process.version,
    },
    stdio: "inherit",
    shell: false,
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

function parseArguments(args) {
  const result = {
    warmups: 2,
    samples: 20,
    output: "artifacts/performance/january-sqlite-baseline.json",
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
    throw new Error(`Unknown January SQLite baseline option: ${argument}`);
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
