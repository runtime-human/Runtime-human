#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function readJson(path) {
  const full = resolve(root, path);
  if (!existsSync(full)) {
    errors.push(`missing ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (error) {
    errors.push(`invalid JSON ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  "scripts/studioctl.mjs",
  "scripts/studio/control-plane-lib.mjs",
  "scripts/studio/control-plane-lib.d.mts",
  "scripts/versioning.mjs",
  "scripts/versioning.d.mts",
  "scripts/gamectl-entry.ts",
];
for (const path of requiredFiles) {
  assert(existsSync(resolve(root, path)), `missing ${path}`);
}

const project = readJson(".studio/project.json");
const zones = readJson(".studio/zones.json");
const context = readJson(".studio/context-map.json");
const packageJson = readJson("package.json");

if (project) {
  assert(project.commands?.studioCtl === "pnpm studioctl", "project studioCtl command mismatch");
  assert(
    project.commands?.versionCheck === "pnpm version:check",
    "project versionCheck command mismatch",
  );
}

const toolingPaths = [
  ".github/**",
  "scripts/studio/**",
  "scripts/studioctl.mjs",
  "scripts/versioning.mjs",
  "scripts/versioning.d.mts",
  "scripts/gamectl.ts",
  "scripts/gamectl-entry.ts",
];
if (zones) {
  const tooling = (zones.zones ?? []).find((zone) => zone.id === "tooling");
  for (const path of toolingPaths) {
    assert(tooling?.paths?.includes(path), `tooling zone missing ${path}`);
  }
}
if (context) {
  for (const path of toolingPaths) {
    assert(context.zones?.tooling?.code?.includes(path), `tooling context missing ${path}`);
  }
}

if (packageJson) {
  const scripts = packageJson.scripts ?? {};
  assert(scripts.gamectl === "tsx scripts/gamectl-entry.ts", "gamectl entrypoint mismatch");
  assert(scripts.studioctl === "node scripts/studioctl.mjs", "studioctl entrypoint mismatch");
  assert(
    scripts["version:check"] === "node scripts/versioning.mjs check",
    "version:check mismatch",
  );
  assert(scripts["version:bump"] === "node scripts/versioning.mjs bump", "version:bump mismatch");
  assert(
    String(scripts["studio:check"] ?? "").includes("node scripts/studio/check-control-plane.mjs"),
    "studio:check must run the control-plane forcing function",
  );
  assert(
    String(scripts["check:fast"] ?? "").includes("pnpm version:check"),
    "check:fast must enforce version:check",
  );
  for (const path of [
    "scripts/studioctl.mjs",
    "scripts/versioning.mjs",
    "scripts/gamectl-entry.ts",
  ]) {
    assert(String(scripts.fmt ?? "").includes(path), `fmt missing ${path}`);
    assert(String(scripts["fmt:check"] ?? "").includes(path), `fmt:check missing ${path}`);
    assert(String(scripts.lint ?? "").includes(path), `lint missing ${path}`);
  }
  assert(
    String(scripts["lint:type-aware"] ?? "").includes("scripts/gamectl-entry.ts"),
    "lint:type-aware missing scripts/gamectl-entry.ts",
  );
}

if (errors.length > 0) {
  console.error("Control-plane configuration invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Control-plane configuration OK");
