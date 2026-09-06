import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-studio-task-exact-"));
  tempRoots.push(root);
  git(root, "init");
  git(root, "config", "user.name", "Runtime Human Test");
  git(root, "config", "user.email", "test@example.invalid");

  writeText(root, "AGENTS.md", "# Agents\n");
  writeText(root, "GAME.md", "# Game\n");
  writeText(root, "docs/INDEX.md", "# Index\n");
  writeText(root, "scripts/studio/exact.mjs", "export const value = 1;\n");
  writeText(root, ".studio/findings/ledger.jsonl", "");
  writeJson(root, ".studio/zones.json", {
    schemaVersion: 1,
    zones: [
      { id: "tooling", paths: ["scripts/studio/**", ".studio/**"], minimumRisk: "R1" },
      { id: "qa-performance", paths: ["tests/**"], minimumRisk: "R1" },
      { id: "canon", paths: ["docs/**", "AGENTS.md", "GAME.md"], minimumRisk: "R2" },
    ],
    exclusiveWriteGroups: [],
  });
  writeJson(root, ".studio/context-map.json", {
    schemaVersion: 1,
    policy: { maxInitialDocs: 3, maxInitialFiles: 4, neverBulkLoad: [] },
    base: ["AGENTS.md", "GAME.md", "docs/INDEX.md"],
    zones: {
      tooling: { agentGuide: null, docs: [], code: ["scripts/studio/**", ".studio/**"] },
      "qa-performance": { agentGuide: null, docs: [], code: ["tests/**"] },
      canon: { agentGuide: null, docs: ["docs/**"], code: [] },
    },
  });
  writeJson(root, ".studio/skill-map.json", {
    schemaVersion: 1,
    skills: [
      { name: "runtime-implement", path: ".agents/skills/runtime-implement", status: "active" },
      { name: "runtime-qa", path: ".agents/skills/runtime-qa", status: "active" },
      { name: "runtime-architecture", path: ".agents/skills/runtime-architecture", status: "active" },
    ],
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

describe("studio:task exact head mode", () => {
  it("derives changed paths only from the explicit immutable base/head pair", () => {
    const { root, base, head } = makeRepo();
    const script = path.resolve(import.meta.dirname, "../scripts/studio/task.mjs");
    const stdout = execFileSync(
      process.execPath,
      [script, "--id", "RH-EXACT", "--base", base, "--head", head, "--json"],
      { cwd: root, encoding: "utf8" },
    );
    const envelope = JSON.parse(stdout) as {
      base: { sha: string };
      head: { sha: string; includesUncommitted: boolean };
      zones: string[];
      stats: { changedFiles: number; consideredFiles: number };
      mustRead: string[];
    };

    expect(envelope.base.sha).toBe(base);
    expect(envelope.head.sha).toBe(head);
    expect(envelope.head.includesUncommitted).toBe(false);
    expect(envelope.zones).toEqual(["tooling"]);
    expect(envelope.stats.changedFiles).toBe(1);
    expect(envelope.stats.consideredFiles).toBe(1);
    expect(envelope.mustRead).toContain("scripts/studio/exact.mjs");
    expect(envelope.mustRead).not.toContain("docs/INDEX.md");
    expect(envelope.mustRead).not.toContain("tests/untracked-leak.test.ts");
  });
});
