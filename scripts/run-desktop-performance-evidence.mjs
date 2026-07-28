#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { createDesktopEvidenceReport } from "./performance/desktop-evidence-contract.mjs";

const options = parseArguments(process.argv.slice(2));
const captures = [];
for (const input of options.inputs) {
  const parsed = JSON.parse(await readFile(input, "utf8"));
  if (Array.isArray(parsed)) captures.push(...parsed);
  else captures.push(parsed);
}

const report = createDesktopEvidenceReport(captures);
await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${report.measurementCount} measurement capture(s) to ${options.output}`);

function parseArguments(args) {
  const inputs = [];
  let output = "artifacts/performance/desktop-performance-evidence.json";
  for (const argument of args) {
    if (argument === "--") continue;
    if (argument.startsWith("--input=")) {
      const input = requireValue(argument, "--input=");
      inputs.push(input);
      continue;
    }
    if (argument.startsWith("--output=")) {
      output = requireValue(argument, "--output=");
      continue;
    }
    throw new Error(`Unknown desktop evidence option: ${argument}`);
  }
  if (inputs.length === 0) throw new Error("At least one --input=<capture.json> is required");
  return { inputs, output };
}

function requireValue(argument, prefix) {
  const value = argument.slice(prefix.length);
  if (value.length === 0) throw new Error(`${prefix.slice(0, -1)} requires a value`);
  return value;
}
