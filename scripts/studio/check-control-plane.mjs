#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function readText(path) {
  const full = resolve(root, path);
  if (!existsSync(full)) {
    errors.push(`missing ${path}`);
    return null;
  }
  return readFileSync(full, "utf8");
}

function readJson(path) {
  const content = readText(path);
  if (content === null) return null;
  try {
    return JSON.parse(content);
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
  "scripts/studio/evidence-lib.mjs",
  "scripts/studio/evidence-lib.d.mts",
  "scripts/studio/remote-command.mjs",
  "scripts/studio/remote-command-lib.mjs",
  "scripts/studio/remote-command-lib.d.mts",
  "scripts/versioning.mjs",
  "scripts/versioning.d.mts",
  "scripts/gamectl-entry.ts",
  ".github/workflows/feedback.yml",
  ".github/workflows/remote-command.yml",
];
for (const path of requiredFiles) {
  assert(existsSync(resolve(root, path)), `missing ${path}`);
}

const project = readJson(".studio/project.json");
const zones = readJson(".studio/zones.json");
const context = readJson(".studio/context-map.json");
const packageJson = readJson("package.json");
const feedback = readText(".github/workflows/feedback.yml");
const foundation = readText(".github/workflows/foundation.yml");
const remoteCommand = readText(".github/workflows/remote-command.yml");

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
  assert(String(scripts.fmt ?? "").includes("scripts/studio"), "fmt must include scripts/studio");
  assert(
    String(scripts["fmt:check"] ?? "").includes("scripts/studio"),
    "fmt:check must include scripts/studio",
  );
  assert(String(scripts.lint ?? "").includes("scripts/studio"), "lint must include scripts/studio");
  assert(
    String(scripts["lint:type-aware"] ?? "").includes("scripts/gamectl-entry.ts"),
    "lint:type-aware missing scripts/gamectl-entry.ts",
  );
}

if (feedback) {
  const requiredSnippets = [
    "name: feedback",
    "- opened",
    "- synchronize",
    "- reopened",
    "runs-on: windows-2025",
    "cancel-in-progress: true",
    "contents: read",
    "pnpm install --frozen-lockfile --reporter=silent",
    "pnpm check:fast",
  ];
  for (const snippet of requiredSnippets) {
    assert(feedback.includes(snippet), `feedback wiring missing ${snippet}`);
  }
  for (const forbidden of [
    "pnpm verify",
    "rustup toolchain install",
    "playwright install",
    "pull_request_target",
    "permissions:\n  contents: write",
  ]) {
    assert(!feedback.includes(forbidden), `feedback must not contain ${forbidden}`);
  }
}

if (foundation) {
  const requiredSnippets = [
    "types: [labeled]",
    "github.event_name != 'pull_request'",
    "github.event.action == 'labeled'",
    "github.event.label.name == 'verify:v3'",
    "fetch-depth: 2",
    "id: v3",
    "continue-on-error: true",
    "pnpm verify",
    "pnpm studioctl evidence",
    "${{ github.event.pull_request.base.sha }}",
    "${{ github.event.pull_request.head.sha }}",
    "${{ github.sha }}",
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
    "retention-days: 7",
    "if-no-files-found: error",
    "include-hidden-files: true",
    "steps.v3.outcome != 'success'",
  ];
  for (const snippet of requiredSnippets) {
    assert(foundation.includes(snippet), `foundation evidence wiring missing ${snippet}`);
  }
  assert(
    !foundation.includes("permissions:\n  contents: write"),
    "foundation must remain read-only",
  );
  assert(
    !foundation.includes("pull_request_target"),
    "foundation must not use pull_request_target",
  );
}

if (remoteCommand) {
  const requiredSnippets = [
    "issue_comment:",
    "types: [created]",
    "contents: read",
    "pull-requests: read",
    "github.event.issue.pull_request",
    "startsWith(github.event.comment.body, '/rh')",
    "ref: ${{ github.sha }}",
    "path: control",
    "GITHUB_TOKEN: ${{ github.token }}",
    "remote-command.mjs admit",
    "ref: ${{ steps.admit.outputs.head_sha }}",
    "path: target",
    "fetch-depth: 0",
    "remote-command.mjs execute",
    "runtime-human-remote-result-${{ github.run_id }}",
    "retention-days: 3",
    "if-no-files-found: error",
  ];
  for (const snippet of requiredSnippets) {
    assert(remoteCommand.includes(snippet), `remote command wiring missing ${snippet}`);
  }
  for (const forbidden of [
    "pull_request_target",
    "workflow_run",
    "secrets.",
    "contents: write",
    "persist-credentials: true",
  ]) {
    assert(!remoteCommand.includes(forbidden), `remote command must not contain ${forbidden}`);
  }
  const runBlocks = [...remoteCommand.matchAll(/run:\s*\|([\s\S]*?)(?=\n\s{6,}- name:|\n\s{4,}[a-zA-Z_-]+:|$)/gu)]
    .map((match) => match[1])
    .join("\n");
  assert(
    !runBlocks.includes("github.event.comment.body"),
    "remote command must never interpolate comment.body into shell source",
  );
}

if (errors.length > 0) {
  console.error("Control-plane configuration invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Control-plane configuration OK");
