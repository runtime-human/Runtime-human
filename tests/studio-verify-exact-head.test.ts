import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function git(root: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function writeText(root: string, relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeJson(root: string, relativePath: string, value: unknown) {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-studio-verify-exact-"));
  tempRoots.push(root);
  git(root, "init");
  git(root, "config", "user.name", "Runtime Human Test");
  git(root, "config", "user.email", "test@example.invalid");

  writeText(root, "scripts/studio/exact.mjs", "export const value = 1;\n");
  writeText(root, "docs/INDEX.md", "# Index\n");
  writeJson(root, ".studio/zones.json", {
    schemaVersion: 1,
    zones: [
      { id: "tooling", paths: ["scripts/studio/**", ".studio/**"], minimumRisk: "R1" },
      { id: "qa-performance", paths: ["tests/**"], minimumRisk: "R1" },
      { id: "canon", paths: ["docs/**"], minimumRisk: "R2" },
    ],
    exclusiveWriteGroups: [],
  });
  writeJson(root, ".studio/context-map.json", {
    schemaVersion: 1,
    policy: { neverBulkLoad: [] },
    base: [],
    zones: {},
  });

  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  const base = git(root, "rev-parse", "HEAD");

  writeText(root, "scripts/studio/exact.mjs", "export const value = 2;\n");
  git(root, "add", "scripts/studio/exact.mjs");
  git(root, "commit", "-m", "head");
  const head = git(root, "rev-parse", "HEAD");

  writeText(root, "docs/INDEX.md", "# Dirty worktree must not leak\n");
  writeText(root, "tests/untracked-leak.test.ts", "export {};\n");

  return { root, base, head };
}

function writeFakePnpm(root: string) {
  const bin = path.join(root, "fake-bin");
  writeText(
    root,
    "fake-bin/pnpm",
    '#!/bin/sh\nprintf "%s\\n" "$*" >> "$PNPM_CALLS"\nexit 0\n',
  );
  fs.chmodSync(path.join(bin, "pnpm"), 0o755);
  writeText(
    root,
    "fake-bin/pnpm.cmd",
    '@echo off\necho %*>>"%PNPM_CALLS%"\nexit /b 0\n',
  );
  return bin;
}

function runVerify(root: string, args: string[]) {
  const script = path.resolve(import.meta.dirname, "../scripts/studio/verify.mjs");
  const callsPath = path.join(root, "pnpm-calls.txt");
  const fakeBin = writeFakePnpm(root);

  execFileSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
      PNPM_CALLS: callsPath,
    },
  });

  return fs
    .readFileSync(callsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("studio:verify exact head mode", () => {
  it("plans verification only from the explicit immutable base/head diff", () => {
    const { root, base, head } = makeRepo();
    const calls = runVerify(root, ["--tier", "V0", "--base", base, "--head", head]);

    expect(calls).toEqual(["studio:check"]);
  });

  it("preserves dirty and untracked inputs in worktree mode", () => {
    const { root, base } = makeRepo();
    const calls = runVerify(root, ["--tier", "V0", "--base", base]);

    expect(calls).toEqual([
      "studio:check",
      "docs:check",
      "exec vitest run tests/untracked-leak.test.ts",
    ]);
  });
});
