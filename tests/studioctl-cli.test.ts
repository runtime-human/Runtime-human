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
  fs.writeFileSync(fullPath, content);
}

function writeJson(root: string, relativePath: string, value: unknown) {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-human-studioctl-"));
  tempRoots.push(root);
  git(root, "init");
  git(root, "config", "user.name", "Runtime Human Test");
  git(root, "config", "user.email", "test@example.invalid");

  writeText(root, "AGENTS.md", "# Agents\n");
  writeText(root, "GAME.md", "# Game\n");
  writeText(root, "docs/INDEX.md", "# Index\n");
  writeText(root, "scripts/studio/existing.mjs", "export {};\n");

  writeJson(root, ".studio/zones.json", {
    schemaVersion: 1,
    zones: [
      {
        id: "tooling",
        paths: ["scripts/studio/**", ".github/**", ".studio/**"],
        minimumRisk: "R1",
      },
      { id: "canon", paths: ["docs/**", "AGENTS.md", "GAME.md"], minimumRisk: "R2" },
    ],
    exclusiveWriteGroups: [],
  });
  writeJson(root, ".studio/context-map.json", {
    schemaVersion: 1,
    policy: { maxInitialDocs: 3, maxInitialFiles: 4, neverBulkLoad: [] },
    base: ["AGENTS.md", "GAME.md", "docs/INDEX.md"],
    zones: {
      tooling: {
        agentGuide: null,
        docs: [],
        code: ["scripts/studio/**", ".github/**", ".studio/**"],
      },
      canon: { agentGuide: null, docs: ["docs/**"], code: [] },
    },
  });
  writeJson(root, ".studio/skill-map.json", {
    schemaVersion: 1,
    skills: [
      {
        name: "runtime-implement",
        path: ".agents/skills/runtime-implement",
        status: "active",
      },
    ],
  });

  const finding = {
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
  };
  writeText(root, ".studio/findings/ledger.jsonl", `${JSON.stringify(finding)}\n`);

  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  const base = git(root, "rev-parse", "HEAD");

  writeText(root, "scripts/studio/existing.mjs", "export const changed = true;\n");
  writeText(root, ".github/workflows/foundation.yml", "name: foundation\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "head");
  const head = git(root, "rev-parse", "HEAD");
  return { root, base, head };
}

describe("studioctl capabilities", () => {
  it("reports only installed control-plane commands and stable contracts", () => {
    const value = buildStudioCapabilities();
    expect(value.schemaVersion).toBe(STUDIO_CAPABILITIES_SCHEMA);
    expect(value.commands).toEqual({ capabilities: 1, inspect: 1, evidence: 1 });
    expect(value.contracts).toMatchObject({
      inspection: CHANGE_INSPECTION_SCHEMA,
      taskEnvelope: "runtime-human-task-envelope-v1",
      evidence: "runtime-human-pr-evidence-v1",
    });
    expect(value.verification).toEqual({ v3: "pnpm verify", v4: "pnpm verify:release" });
  });

  it("executes as a real Node CLI entrypoint", () => {
    const script = path.resolve(import.meta.dirname, "../scripts/studioctl.mjs");
    const stdout = execFileSync(process.execPath, [script, "capabilities", "--json"], {
      encoding: "utf8",
    });
    const value = JSON.parse(stdout) as {
      schemaVersion: string;
      commands: Record<string, number>;
    };

    expect(value.schemaVersion).toBe(STUDIO_CAPABILITIES_SCHEMA);
    expect(value.commands).toEqual({ capabilities: 1, inspect: 1, evidence: 1 });
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
    expect(result.unmatchedPaths).toEqual([]);
    expect(fs.existsSync(path.join(root, ".studio", "runtime"))).toBe(false);
  });

  it("fails closed when the findings ledger at the inspected head is invalid", () => {
    const { root, head } = makeRepo();
    writeText(root, ".studio/findings/ledger.jsonl", "{ invalid-jsonl\n");
    git(root, "add", ".studio/findings/ledger.jsonl");
    git(root, "commit", "-m", "break findings ledger");
    const invalidHead = git(root, "rev-parse", "HEAD");

    expect(() => inspectChange(root, { base: head, head: invalidHead })).toThrow(
      /Invalid JSONL.*ledger\.jsonl:1/u,
    );
  });
});
