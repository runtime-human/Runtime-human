import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CHANGE_INSPECTION_SCHEMA,
  STUDIO_CAPABILITIES_SCHEMA,
  buildStudioCapabilities,
  inspectChange,
} from "../scripts/studio/control-plane-lib.mjs";

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) fs.rmSync(tempRoots.pop()!, { recursive: true, force: true });
});

function git(root: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const full = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-studioctl-"));
  tempRoots.push(root);
  git(root, "init");
  git(root, "config", "user.name", "Runtime Human Test");
  git(root, "config", "user.email", "test@example.invalid");

  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Agents\n");
  fs.writeFileSync(path.join(root, "GAME.md"), "# Game\n");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "INDEX.md"), "# Index\n");
  fs.mkdirSync(path.join(root, "scripts", "studio"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts", "studio", "existing.mjs"), "export {};\n");

  writeJson(root, ".studio/zones.json", {
    schemaVersion: 1,
    zones: [
      { id: "tooling", paths: ["scripts/studio/**", ".github/**"], minimumRisk: "R1" },
      { id: "canon", paths: ["docs/**", "AGENTS.md", "GAME.md"], minimumRisk: "R2" },
    ],
    exclusiveWriteGroups: [],
  });
  writeJson(root, ".studio/context-map.json", {
    schemaVersion: 1,
    policy: { maxInitialDocs: 3, maxInitialFiles: 4, neverBulkLoad: [] },
    base: ["AGENTS.md", "GAME.md", "docs/INDEX.md"],
    zones: {
      tooling: { agentGuide: null, docs: [], code: ["scripts/studio/**", ".github/**"] },
      canon: { agentGuide: null, docs: ["docs/**"], code: [] },
    },
  });
  writeJson(root, ".studio/skill-map.json", {
    schemaVersion: 1,
    skills: [
      { name: "runtime-implement", path: ".agents/skills/runtime-implement", status: "active" },
    ],
  });
  fs.mkdirSync(path.join(root, ".studio", "findings"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".studio", "findings", "ledger.jsonl"),
    `${JSON.stringify({
      id: "RF-TOOLING",
      fingerprint: "tooling:studio:contract:none",
      zone: "tooling",
      severity: "S2",
      size: "S",
      scope: "local",
      category: "contract",
      component: "studio",
      invariant: null,
      summary: "Studio contract regression",
      disposition: "LEDGER",
      status: "open",
      occurrences: 1,
    })}\n`,
  );

  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  const base = git(root, "rev-parse", "HEAD");

  fs.writeFileSync(path.join(root, "scripts", "studio", "existing.mjs"), "export const changed = true;\n");
  fs.mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(root, ".github", "workflows", "foundation.yml"), "name: foundation\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "head");
  const head = git(root, "rev-parse", "HEAD");
  return { root, base, head };
}

describe("studioctl capabilities", () => {
  it("reports stable installed control-plane contracts", () => {
    const value = buildStudioCapabilities();
    expect(value.schemaVersion).toBe(STUDIO_CAPABILITIES_SCHEMA);
    expect(value.commands).toEqual({ inspect: 1, verify: 1, evidence: 1 });
    expect(value.contracts).toMatchObject({
      inspection: CHANGE_INSPECTION_SCHEMA,
      evidence: "runtime-human-pr-evidence-v1",
      taskEnvelope: "runtime-human-task-envelope-v1",
    });
    expect(value.verification).toEqual({ v3: "pnpm verify", v4: "pnpm verify:release" });
  });
});

describe("studioctl inspect", () => {
  it("projects an exact immutable diff without writing runtime state", () => {
    const { root, base, head } = makeRepo();
    const result = inspectChange(root, { base, head });

    expect(result.schemaVersion).toBe(CHANGE_INSPECTION_SCHEMA);
    expect(result.baseSha).toBe(base);
    expect(result.headSha).toBe(head);
    expect(result.changedPaths).toEqual([
      ".github/workflows/foundation.yml",
      "scripts/studio/existing.mjs",
    ]);
    expect(result.zones).toEqual(["tooling"]);
    expect(result.primaryZone).toBe("tooling");
    expect(result.risk).toBe("R1");
    expect(result.authorityImpact).toMatchObject({
      canon: false,
      gameplay: false,
      persistence: false,
      schema: false,
      security: false,
      ciGovernance: true,
    });
    expect(result.skills).toContain("runtime-implement");
    expect(result.relevantFindings.map((finding: { id: string }) => finding.id)).toContain(
      "RF-TOOLING",
    );
    expect(result.verification.requiredTier).toBe("V1");
    expect(result.verification.v3Recommended).toBe(false);
    expect(fs.existsSync(path.join(root, ".studio", "runtime"))).toBe(false);
  });
});
