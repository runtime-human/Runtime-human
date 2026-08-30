#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "jsonc-parser";

const root = process.cwd();
const errors = [];
const expectedRepository = "runtime-human/Runtime-human";

function report(path, rule) {
  errors.push(`${path}: ${rule}`);
}

function readText(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const readme = readText("README.md");
if (!readme.includes("публичный репозиторий")) {
  report("README.md", "must identify the repository as public");
}
for (const stale of [
  "Этот приватный репозиторий",
  "Self-hosted Windows workflow является обязательным merge gate",
]) {
  if (readme.includes(stale)) {
    report("README.md", "contains stale private/self-hosted repository guidance");
  }
}

const index = readText("docs/INDEX.md");
if (index.includes("github.com/MrFr3di/Runtime-human")) {
  report("docs/INDEX.md", "contains the pre-transfer GitHub repository namespace");
}

const executionStatusErrors = [];
const executionStatus = parse(readText("docs/EXECUTION-STATUS.jsonc"), executionStatusErrors);
if (executionStatusErrors.length > 0) {
  report("docs/EXECUTION-STATUS.jsonc", "must be valid JSONC");
} else {
  if (executionStatus.repository !== expectedRepository) {
    report(
      "docs/EXECUTION-STATUS.jsonc",
      "repository identity does not match the public repository",
    );
  }
  if (executionStatus.verification?.runner !== "github-hosted-windows-2025") {
    report(
      "docs/EXECUTION-STATUS.jsonc",
      "verification runner must describe the GitHub-hosted Windows gate",
    );
  }
  if (executionStatus.verification?.qualityGate !== "pnpm verify") {
    report("docs/EXECUTION-STATUS.jsonc", "qualityGate must match the canonical V3 command");
  }
}

const workflowDir = resolve(root, ".github/workflows");
for (const name of readdirSync(workflowDir).filter((entry) => /\.ya?ml$/i.test(entry))) {
  const path = `.github/workflows/${name}`;
  if (/^\s*runs-on:\s*self-hosted\s*$/im.test(readText(path))) {
    report(path, "ordinary tracked workflows must not target self-hosted runners");
  }
}

const handoffs = spawnSync("git", ["ls-files", "-z", "--", ".opencode/HANDOFF-*.md"], {
  cwd: root,
  encoding: "utf8",
});
if (handoffs.status !== 0) {
  report("git", "could not enumerate tracked handoff files");
} else if (handoffs.stdout) {
  report(".opencode/HANDOFF-*.md", "ephemeral session handoffs must not be tracked");
}

const tracked = spawnSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
if (tracked.status !== 0) {
  report("git", "could not enumerate tracked files");
} else {
  const patterns = [
    {
      rule: "contains a personal Windows user-home path",
      regex: /[A-Za-z]:\\Users\\(?!<|\.\.\.)[^\\\r\n]+\\/i,
    },
    {
      rule: "contains a personal macOS user-home path",
      regex: /\/Users\/(?!<|\.\.\.)[^/\r\n]+\//,
    },
    {
      rule: "contains a personal Linux user-home path",
      regex: /\/home\/(?!runner(?:\/|\b)|<|\.\.\.)[^/\r\n]+\//,
    },
    {
      rule: "contains a local Runtime Human checkout path",
      regex: /[A-Za-z]:\\(?:Reposit|Repos?|Projects?|Source)\\Runtime-human\b/i,
    },
  ];

  for (const path of tracked.stdout.split("\0").filter(Boolean)) {
    const full = resolve(root, path);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (!stats.isFile() || stats.size > 1_000_000) continue;

    let content;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    if (content.includes("\0")) continue;

    for (const { rule, regex } of patterns) {
      if (regex.test(content)) report(path, rule);
    }
  }
}

if (errors.length) {
  console.error("Public repository guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Public repository guard OK");
