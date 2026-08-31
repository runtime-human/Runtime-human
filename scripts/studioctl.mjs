#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { buildStudioCapabilities, inspectChange } from "./studio/control-plane-lib.mjs";

const USAGE = [
  "Usage: studioctl <command> [options]",
  "",
  "Commands:",
  "  capabilities                 report exact installed control-plane capabilities",
  "  inspect --base <ref> --head <ref>  inspect an exact Git diff without writing runtime state",
  "",
  "Options:",
  "  --json                       emit one JSON object on stdout",
  "  --root <path>                repository root (default: current directory)",
].join("\n");

function parse(argv) {
  return parseArgs({
    args: [...argv],
    options: {
      json: { type: "boolean", default: false },
      root: { type: "string" },
      base: { type: "string" },
      head: { type: "string" },
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
    if (extra.length > 0 || values.base !== undefined || values.head !== undefined) {
      emitError(values.json, "usage-error", "capabilities takes no positional/base/head arguments");
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
    if (extra.length > 0 || !values.base || !values.head) {
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
      emitError(values.json, "inspection-failed", error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  emitError(values.json, "unknown-command", command ? `unknown command ${command}` : "missing command");
  return 2;
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) process.exitCode = runStudioctl();
