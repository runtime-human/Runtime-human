import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PR_EVIDENCE_SCHEMA,
  buildPrEvidence,
  collectPrEvidence,
  renderPrEvidenceSummary,
  serializePrEvidence,
} from "../scripts/studio/evidence-lib.mjs";

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
  fs.writeFileSync(fullPath, content);
}

function writeJson(root: string, relativePath: string, value: unknown) {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-pr-evidence-"));
  tempRoots.push(root);
  git(root, "init");
  git(root, "config", "user.name", "Runtime Human Test");
  git(root, "config", "user.email", "test@example.invalid");

  writeText(root, "AGENTS.md", "# Agents\n");
  writeText(root, "GAME.md", "# Game\n");
  writeText(root, "scripts/studio/existing.mjs", "export {};\n");
  writeJson(root, ".studio/zones.json", {
    schemaVersion: 1,
    zones: [
      {
        id: "tooling",
        paths: ["scripts/studio/**", ".github/**", ".studio/**"],
        minimumRisk: "R1",
      },
    ],
    exclusiveWriteGroups: [],
  });
  writeJson(root, ".studio/context-map.json", {
    schemaVersion: 1,
    policy: { maxInitialDocs: 2, maxInitialFiles: 4, neverBulkLoad: [] },
    base: ["AGENTS.md", "GAME.md"],
    zones: {
      tooling: { agentGuide: null, docs: [], code: ["scripts/studio/**", ".github/**", ".studio/**"] },
    },
  });
  writeJson(root, ".studio/skill-map.json", {
    schemaVersion: 1,
    skills: [
      { name: "runtime-implement", path: ".agents/skills/runtime-implement", status: "active" },
    ],
  });
  writeText(root, ".studio/findings/ledger.jsonl", "");

  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  const base = git(root, "rev-parse", "HEAD");

  writeText(root, "scripts/studio/existing.mjs", "export const changed = true;\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "head");
  const head = git(root, "rev-parse", "HEAD");
  const tree = git(root, "rev-parse", `${head}^{tree}`);
  const tested = git(root, "commit-tree", tree, "-p", base, "-p", head, "-m", "synthetic merge");
  return { root, base, head, tested };
}

describe("runtime-human-pr-evidence-v1", () => {
  it("keeps base, candidate head, and tested synthetic merge identities distinct", () => {
    const { root, base, head, tested } = makeRepo();
    const value = collectPrEvidence(root, {
      base,
      head,
      tested,
      status: "success",
      exitCode: 0,
    });

    expect(value.schemaVersion).toBe(PR_EVIDENCE_SCHEMA);
    expect(value.baseSha).toBe(base);
    expect(value.headSha).toBe(head);
    expect(value.testedSha).toBe(tested);
    expect(new Set([value.baseSha, value.headSha, value.testedSha]).size).toBe(3);
    expect(value.inspection).toMatchObject({
      schemaVersion: "runtime-human-change-inspection-v1",
      baseSha: base,
      headSha: head,
      changedPaths: ["scripts/studio/existing.mjs"],
    });
    expect(value.verification).toEqual({
      tier: "V3",
      authority: "pnpm verify",
      status: "success",
      result: { command: "pnpm verify", ok: true, code: 0 },
    });
  });

  it("serializes deterministically and renders a compact summary", () => {
    const { root, base, head, tested } = makeRepo();
    const value = collectPrEvidence(root, {
      base,
      head,
      tested,
      status: "success",
      exitCode: 0,
    });

    const first = serializePrEvidence(value);
    const second = serializePrEvidence(value);
    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(true);
    expect(JSON.parse(first)).toEqual(value);

    const summary = renderPrEvidenceSummary(value);
    expect(summary).toContain("Runtime Human PR evidence");
    expect(summary).toContain(head);
    expect(summary).toContain(tested);
    expect(summary).toContain("V3");
    expect(summary).toContain("success");
  });

  it("preserves a failed canonical V3 result instead of converting it to success", () => {
    const { root, base, head, tested } = makeRepo();
    const value = collectPrEvidence(root, {
      base,
      head,
      tested,
      status: "failure",
      exitCode: 1,
    });

    expect(value.verification).toMatchObject({
      status: "failure",
      result: { command: "pnpm verify", ok: false, code: 1 },
    });
  });

  it("fails closed for missing, malformed, mismatched, or contradictory evidence inputs", () => {
    const { root, base, head, tested } = makeRepo();
    const valid = collectPrEvidence(root, {
      base,
      head,
      tested,
      status: "success",
      exitCode: 0,
    });

    expect(() =>
      buildPrEvidence({ inspection: null, testedSha: tested, status: "success", exitCode: 0 }),
    ).toThrow(/inspection/u);
    expect(() =>
      buildPrEvidence({
        inspection: { ...valid.inspection, schemaVersion: "wrong-schema" },
        testedSha: tested,
        status: "success",
        exitCode: 0,
      }),
    ).toThrow(/inspection schema/u);
    expect(() =>
      buildPrEvidence({
        inspection: { ...valid.inspection, baseSha: head },
        testedSha: tested,
        status: "success",
        exitCode: 0,
      }),
    ).toThrow(/baseSha.*headSha/u);
    expect(() =>
      buildPrEvidence({
        inspection: valid.inspection,
        testedSha: tested,
        status: "success",
        exitCode: 1,
      }),
    ).toThrow(/success.*code 0/u);
  });

  it("propagates malformed inspection sources instead of dropping them", () => {
    const { root, head, tested } = makeRepo();
    writeText(root, ".studio/findings/ledger.jsonl", "{ invalid-jsonl\n");
    git(root, "add", ".studio/findings/ledger.jsonl");
    git(root, "commit", "-m", "break ledger");
    const brokenHead = git(root, "rev-parse", "HEAD");

    expect(() =>
      collectPrEvidence(root, {
        base: head,
        head: brokenHead,
        tested,
        status: "failure",
        exitCode: 1,
      }),
    ).toThrow(/Invalid JSONL.*ledger\.jsonl:1/u);
  });

  it("materializes JSON and Markdown through the real studioctl entrypoint", () => {
    const { root, base, head, tested } = makeRepo();
    const script = path.resolve(import.meta.dirname, "../scripts/studioctl.mjs");
    const evidencePath = path.join(root, "out", "evidence.json");
    const summaryPath = path.join(root, "out", "summary.md");
    const stdout = execFileSync(
      process.execPath,
      [
        script,
        "evidence",
        "--root",
        root,
        "--base",
        base,
        "--head",
        head,
        "--tested",
        tested,
        "--status",
        "success",
        "--exit-code",
        "0",
        "--output",
        evidencePath,
        "--summary-output",
        summaryPath,
        "--json",
      ],
      { encoding: "utf8" },
    );

    expect(JSON.parse(stdout)).toMatchObject({
      schemaVersion: PR_EVIDENCE_SCHEMA,
      baseSha: base,
      headSha: head,
      testedSha: tested,
    });
    expect(JSON.parse(fs.readFileSync(evidencePath, "utf8"))).toMatchObject({ testedSha: tested });
    expect(fs.readFileSync(summaryPath, "utf8")).toContain("Runtime Human PR evidence");
  });
});
