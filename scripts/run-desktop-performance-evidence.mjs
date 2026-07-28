#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createDesktopEvidenceReport } from "./performance/desktop-evidence-contract.mjs";

const DEFAULT_OUTPUT = "artifacts/performance/desktop-performance-evidence.json";

export function parseDesktopEvidenceArguments(args) {
  const inputs = [];
  let output = DEFAULT_OUTPUT;
  let outputWasSpecified = false;

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
    throw new Error(`Unknown desktop evidence option: ${argument}`);
  }

  if (inputs.length === 0) throw new Error("At least one --input=<capture.json> is required");
  return Object.freeze({ inputs: Object.freeze(inputs), output });
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
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  log(`Wrote ${report.measurementCount} measurement capture(s) to ${options.output}`);
  return report;
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
