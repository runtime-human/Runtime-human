#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createDesktopEvidenceReport } from "./performance/desktop-evidence-contract.mjs";

const DEFAULT_OUTPUT = "artifacts/performance/desktop-performance-evidence.json";
const E3_MINIMUM_WARMUPS = 5;
const E3_MINIMUM_MEASUREMENTS = 30;

export function parseDesktopEvidenceArguments(args) {
  const inputs = [];
  let output = DEFAULT_OUTPUT;
  let outputWasSpecified = false;
  let series = null;

  for (const argument of args) {
    if (argument === "--") continue;
    if (argument.startsWith("--input=")) {
      inputs.push(requireValue(argument, "--input="));
      continue;
    }
    if (argument.startsWith("--output=")) {
      if (outputWasSpecified) throw new Error("Only one --output=<report.json> is allowed");
      output = requireValue(argument, "--output=");
      outputWasSpecified = true;
      continue;
    }
    if (argument.startsWith("--series=")) {
      if (series !== null) throw new Error("Only one --series=<mode> is allowed");
      const value = requireValue(argument, "--series=");
      if (value !== "e3") throw new Error(`Unsupported desktop evidence series mode: ${value}`);
      series = value;
      continue;
    }
    throw new Error(`Unknown desktop evidence option: ${argument}`);
  }

  if (inputs.length === 0) throw new Error("At least one --input=<capture.json> is required");
  const options = { inputs: Object.freeze(inputs), output };
  return Object.freeze(series === null ? options : { ...options, series });
}

export async function runDesktopEvidenceCli(args, log = console.log) {
  const options = parseDesktopEvidenceArguments(args);
  const captures = [];

  for (const input of options.inputs) {
    const parsed = JSON.parse(await readFile(input, "utf8"));
    if (Array.isArray(parsed)) captures.push(...parsed);
    else captures.push(parsed);
  }

  const report = createDesktopEvidenceReport(captures);
  if (options.series === "e3") assertE3SeriesCoverage(report.captures);
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  log(`Wrote ${report.measurementCount} measurement capture(s) to ${options.output}`);
  return report;
}

function assertE3SeriesCoverage(captures) {
  const groups = new Map();
  for (const capture of captures) {
    const key = [
      capture.scenario,
      capture.classification.process,
      capture.classification.osCache,
      capture.classification.database,
    ].join("|");
    const counts = groups.get(key) ?? { warmup: 0, measurement: 0 };
    counts[capture.classification.sampleRole] += 1;
    groups.set(key, counts);
  }

  for (const [key, counts] of [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (counts.warmup < E3_MINIMUM_WARMUPS) {
      throw new Error(
        `E3 evidence group ${key} requires at least ${E3_MINIMUM_WARMUPS} warmup capture(s); received ${counts.warmup}`,
      );
    }
    if (counts.measurement < E3_MINIMUM_MEASUREMENTS) {
      throw new Error(
        `E3 evidence group ${key} requires at least ${E3_MINIMUM_MEASUREMENTS} measurement capture(s); received ${counts.measurement}`,
      );
    }
  }
}

function requireValue(argument, prefix) {
  const value = argument.slice(prefix.length);
  if (value.length === 0) throw new Error(`${prefix.slice(0, -1)} requires a value`);
  return value;
}

function isDirectExecution(moduleUrl, scriptPath) {
  return scriptPath !== undefined && moduleUrl === pathToFileURL(resolve(scriptPath)).href;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  runDesktopEvidenceCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
