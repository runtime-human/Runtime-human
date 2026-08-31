#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { buildStudioCapabilities, inspectChange } from "./studio/control-plane-lib.mjs";
import {
  collectPrEvidence,
  renderPrEvidenceSummary,
  serializePrEvidence,
} from "./studio/evidence-lib.mjs";

const USAGE = [
  "Usage: studioctl <command> [options]",
  "",
  "Commands:",
  "  capabilities                 report exact installed control-plane capabilities",
  "  inspect --base <ref> --head <ref>  inspect an exact Git diff without writing runtime state",
  "  evidence --base <ref> --head <ref> --tested <ref> --status <success|failure> --exit-code <n>",
  "                               package exact PR/V3 evidence without running verification",
  "",
  "Options:",
  "  --json                       emit one JSON object on stdout",
  "  --root <path>                repository root (default: current directory)",
  "  --output <path>              write evidence JSON",
  "  --summary-output <path>      write compact Markdown summary",
].join("\n");

function parse(argv) {
  return parseArgs({
    args: [...argv],
    options: {
      json: { type: "boolean", default: false },
      root: { type: "string" },
      base: { type: "string" },
      head: { type: "string" },
      tested: { type: "string" },
      status: { type: "string" },
      "exit-code": { type: "string" },
      output: { type: "string" },
      "summary-output": { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });
}

function emitError(json, code, message) {
  if (json) {
    console.log(
      JSON.stringify({
        schemaVersion: "runtime-human-studioctl-error-v1",
        ok: false,
        error: { code, message },
      }),
    );
  } else {
    console.error(`error: ${code}: ${message}`);
    console.error(USAGE);
  }
}

function writeRequested(root, relativeOrAbsolute, content) {
  const outputPath = path.resolve(root, relativeOrAbsolute);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
}

export function runStudioctl(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parse(argv);
  } catch (error) {
    const json = argv.includes("--json");
    emitError(json, "usage-error", error instanceof Error ? error.message : String(error));
    return 2;
  }

  const { values, positionals } = parsed;
  const command = positionals[0];
  const extra = positionals.slice(1);
  if (command === "capabilities") {
    if (
      extra.length > 0 ||
      values.base !== undefined ||
      values.head !== undefined ||
      values.tested !== undefined ||
      values.status !== undefined ||
      values["exit-code"] !== undefined ||
      values.output !== undefined ||
      values["summary-output"] !== undefined
    ) {
      emitError(values.json, "usage-error", "capabilities takes no command-specific arguments");
      return 2;
    }
    const result = buildStudioCapabilities();
    if (values.json) console.log(JSON.stringify(result));
    else {
      console.log(`studioctl ${result.schemaVersion}`);
      console.log(`commands: ${Object.keys(result.commands).join(", ")}`);
      console.log(`V3: ${result.verification.v3}`);
    }
    return 0;
  }

  if (command === "inspect") {
    if (
      extra.length > 0 ||
      !values.base ||
      !values.head ||
      values.tested !== undefined ||
      values.status !== undefined ||
      values["exit-code"] !== undefined ||
      values.output !== undefined ||
      values["summary-output"] !== undefined
    ) {
      emitError(values.json, "usage-error", "inspect requires exactly --base <ref> --head <ref>");
      return 2;
    }
    try {
      const result = inspectChange(path.resolve(values.root ?? process.cwd()), {
        base: values.base,
        head: values.head,
      });
      if (values.json) console.log(JSON.stringify(result));
      else {
        console.log(`${result.baseSha.slice(0, 12)}..${result.headSha.slice(0, 12)}`);
        console.log(`${result.changedPaths.length} changed path(s)`);
        console.log(`zones: ${result.zones.join(", ") || "none"}`);
        console.log(`risk: ${result.risk}; verification: ${result.verification.requiredTier}`);
      }
      return 0;
    } catch (error) {
      emitError(
        values.json,
        "inspection-failed",
        error instanceof Error ? error.message : String(error),
      );
      return 1;
    }
  }

  if (command === "evidence") {
    if (
      extra.length > 0 ||
      !values.base ||
      !values.head ||
      !values.tested ||
      !values.status ||
      values["exit-code"] === undefined
    ) {
      emitError(
        values.json,
        "usage-error",
        "evidence requires --base, --head, --tested, --status and --exit-code",
      );
      return 2;
    }
    try {
      const root = path.resolve(values.root ?? process.cwd());
      const exitCode = Number(values["exit-code"]);
      const result = collectPrEvidence(root, {
        base: values.base,
        head: values.head,
        tested: values.tested,
        status: values.status,
        exitCode,
      });
      const serialized = serializePrEvidence(result);
      const summary = renderPrEvidenceSummary(result);
      if (values.output) writeRequested(root, values.output, serialized);
      if (values["summary-output"]) writeRequested(root, values["summary-output"], summary);
      if (values.json) process.stdout.write(serialized);
      else process.stdout.write(summary);
      return 0;
    } catch (error) {
      emitError(values.json, "evidence-failed", error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  emitError(
    values.json,
    "unknown-command",
    command ? `unknown command ${command}` : "missing command",
  );
  return 2;
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) process.exitCode = runStudioctl();
