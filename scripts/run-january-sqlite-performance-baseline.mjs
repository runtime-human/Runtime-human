#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpus, release, totalmem } from "node:os";
import { resolve } from "node:path";

import { parseBaselineArguments } from "./performance/baseline-cli.mjs";

const options = parseBaselineArguments(
  process.argv.slice(2),
  {
    warmups: 2,
    samples: 20,
    output: "artifacts/performance/january-sqlite-baseline.json",
  },
  "January SQLite baseline",
);
const cpu = cpus()[0];
const cargo = process.platform === "win32" ? "cargo.exe" : "cargo";
const cargoRun = spawnSync(
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
      RUNTIME_HUMAN_PERF_COMMIT: options.commit ?? process.env.GITHUB_SHA ?? "unrecorded",
      RUNTIME_HUMAN_PERF_OS_RELEASE: release(),
      RUNTIME_HUMAN_PERF_CPU_MODEL: cpu?.model ?? "unknown",
      RUNTIME_HUMAN_PERF_LOGICAL_CORES: String(cpus().length),
      RUNTIME_HUMAN_PERF_TOTAL_MEMORY_MIB: String(Math.round(totalmem() / 1024 / 1024)),
      RUNTIME_HUMAN_PERF_NODE_VERSION: process.version,
    },
    stdio: "inherit",
    shell: false,
  },
);

if (cargoRun.error) throw cargoRun.error;
process.exitCode = cargoRun.status ?? 1;
