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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-studio-affected-exact-"));
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

function runAffected(root: string, args: string[]) {
  const script = path.resolve(import.meta.dirname, "../scripts/studio/affected.mjs");
  return JSON.parse(
    execFileSync(process.execPath, [script, ...args, "--json"], {
      cwd: root,
      encoding: "utf8",
    }),
  ) as {
    base: { sha: string };
    head: { ref: string; sha: string };
    zones: string[];
    risk: string;
  };
}

describe("studio:affected exact head mode", () => {
  it("classifies only the explicit immutable base/head diff", () => {
    const { root, base, head } = makeRepo();
    const affected = runAffected(root, ["--base", base, "--head", head]);

    expect(affected.base.sha).toBe(base);
    expect(affected.head.sha).toBe(head);
    expect(affected.head.ref).toBe(head);
    expect(affected.zones).toEqual(["tooling"]);
    expect(affected.risk).toBe("R1");
  });

  it("preserves dirty and untracked inputs in worktree mode", () => {
    const { root, base, head } = makeRepo();
    const affected = runAffected(root, ["--base", base]);

    expect(affected.base.sha).toBe(base);
    expect(affected.head.sha).toBe(head);
    expect(affected.head.ref).toBe("WORKTREE");
    expect(affected.zones).toEqual(["tooling", "qa-performance", "canon"]);
    expect(affected.risk).toBe("R2");
  });
});
