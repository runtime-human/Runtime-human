import { spawnSync } from "node:child_process";
import path from "node:path";

import { OPEN_LEDGER } from "./findings-lib.mjs";
import { shouldRecommendFullGate } from "./harness-lib.mjs";
import {
  TASK_ENVELOPE_SCHEMA,
  buildReadLists,
  classifyRisk,
  deriveVerification,
  isIgnoredPath,
  resolveZones,
  selectRelevantFindings,
  selectSkills,
  toPosix,
} from "./context-lib.mjs";

export const STUDIO_CAPABILITIES_SCHEMA = "runtime-human-studio-capabilities-v1";
export const CHANGE_INSPECTION_SCHEMA = "runtime-human-change-inspection-v1";

function git(root, args, options = {}) {
  const result = spawnSync("git", args.map(String), {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    ...options,
  });
  if (result.error) throw new Error(`git ${args.join(" ")} failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr ?? "").trim();
    throw new Error(`git ${args.join(" ")} exited ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return String(result.stdout ?? "");
}

function resolveCommit(root, ref) {
  const output = git(root, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
  if (!/^[0-9a-f]{40}$/u.test(output))
    throw new Error(`git ref did not resolve to a full SHA: ${ref}`);
  return output;
}

function readTextAt(root, sha, relativePath) {
  return git(root, ["show", `${sha}:${toPosix(relativePath)}`]);
}

function readJsonAt(root, sha, relativePath) {
  try {
    return JSON.parse(readTextAt(root, sha, relativePath));
  } catch (error) {
    throw new Error(
      `${relativePath} is unavailable or invalid at ${sha}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function readJsonlAt(root, sha, relativePath) {
  try {
    return readTextAt(root, sha, relativePath)
      .split(/\r?\n/u)
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function existsAt(root, sha, relativePath) {
  const result = spawnSync("git", ["cat-file", "-e", `${sha}:${toPosix(relativePath)}`], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return result.status === 0;
}

function exclusiveConflict(zoneIds, groups) {
  return (groups ?? []).some(
    (group) => group.filter((zoneId) => zoneIds.includes(zoneId)).length > 1,
  );
}

function primaryZone(selected) {
  return (
    selected
      .map((entry, index) => ({ id: entry.id, count: entry.matched.length, index }))
      .toSorted(
        (a, b) => b.count - a.count || a.index - b.index || a.id.localeCompare(b.id, "en"),
      )[0]?.id ?? null
  );
}

function authorityImpact(changedPaths) {
  const paths = changedPaths.map(toPosix);
  const any = (patterns) =>
    paths.some((candidate) => patterns.some((pattern) => pattern.test(candidate)));
  return {
    canon: any([/^docs\//u, /^AGENTS\.md$/u, /^GAME\.md$/u]),
    gameplay: any([
      /^packages\/game-core\//u,
      /^packages\/game-application\//u,
      /^packages\/game-content\//u,
      /^packages\/game-simulation\//u,
      /^content\//u,
      /^balance\//u,
    ]),
    persistence: any([
      /^packages\/game-persistence-contracts\//u,
      /^apps\/desktop\/src-tauri\/src\/persistence\//u,
    ]),
    schema: any([
      /^packages\/game-schema\//u,
      /^packages\/game-authoring-schema\//u,
      /(?:^|\/)schema(?:s)?(?:\/|\.|-)/u,
    ]),
    security: any([
      /^SECURITY\.md$/u,
      /^apps\/desktop\/src-tauri\/capabilities\//u,
      /^apps\/desktop\/src-tauri\/tauri\.conf\.json$/u,
    ]),
    ciGovernance: any([
      /^\.github\//u,
      /^CONTRIBUTING\.md$/u,
      /^CODEOWNERS$/u,
      /^scripts\/studio\//u,
      /^scripts\/studioctl\.mjs$/u,
      /^scripts\/versioning\.mjs$/u,
      /^scripts\/gamectl\.ts$/u,
      /^scripts\/gamectl-entry\.ts$/u,
    ]),
  };
}

export function buildStudioCapabilities() {
  return {
    schemaVersion: STUDIO_CAPABILITIES_SCHEMA,
    commands: { capabilities: 1, inspect: 1 },
    contracts: {
      inspection: CHANGE_INSPECTION_SCHEMA,
      taskEnvelope: TASK_ENVELOPE_SCHEMA,
    },
    verification: { v3: "pnpm verify", v4: "pnpm verify:release" },
  };
}

export function inspectChange(root, { base, head }) {
  const repositoryRoot = path.resolve(root);
  const baseSha = resolveCommit(repositoryRoot, base);
  const headSha = resolveCommit(repositoryRoot, head);
  const changedPaths = [
    ...new Set(
      git(repositoryRoot, ["diff", "--name-only", "-z", baseSha, headSha])
        .split("\0")
        .filter(Boolean)
        .map(toPosix),
    ),
  ].toSorted((a, b) => a.localeCompare(b, "en"));

  const zonesConfig = readJsonAt(repositoryRoot, headSha, ".studio/zones.json");
  const contextMap = readJsonAt(repositoryRoot, headSha, ".studio/context-map.json");
  const skillMap = readJsonAt(repositoryRoot, headSha, ".studio/skill-map.json");
  const neverBulkLoad = contextMap.policy?.neverBulkLoad ?? [];
  const resolution = resolveZones(changedPaths, zonesConfig.zones ?? [], {
    fallbackZone: "tooling",
    neverBulkLoad,
  });
  const zones = resolution.selected.map((entry) => entry.id);
  const risk = classifyRisk(zones, zonesConfig.zones ?? [], {
    changedPaths: resolution.selected.flatMap((entry) => entry.matched),
  }).risk;
  const skills = selectSkills(zones, risk, skillMap.skills ?? []);

  const guides = zones
    .map((zoneId) => contextMap.zones?.[zoneId]?.agentGuide)
    .filter((guide, index, values) => guide && values.indexOf(guide) === index)
    .filter((guide) => existsAt(repositoryRoot, headSha, guide));
  const baseDocs = (contextMap.base ?? ["AGENTS.md", "GAME.md"]).filter((document) =>
    existsAt(repositoryRoot, headSha, document),
  );
  const changedExisting = changedPaths.filter(
    (candidate) =>
      existsAt(repositoryRoot, headSha, candidate) && !isIgnoredPath(candidate, neverBulkLoad),
  );
  const reads = buildReadLists({
    base: baseDocs,
    guides,
    changedExisting,
    policy: {
      maxInitialDocs: contextMap.policy?.maxInitialDocs ?? 5,
      maxInitialFiles: contextMap.policy?.maxInitialFiles ?? 8,
    },
  });

  const findings = selectRelevantFindings(
    readJsonlAt(repositoryRoot, headSha, OPEN_LEDGER),
    { zoneIds: zones, changedPaths: changedExisting, taskText: "" },
    3,
  );
  const allowedWrite = zones.flatMap((zoneId) => {
    const declaration = (zonesConfig.zones ?? []).find((zone) => zone.id === zoneId);
    return declaration?.paths ?? [];
  });
  const tier = risk === "R1" ? "V1" : "V2";
  const derived = deriveVerification(zones, changedPaths, tier);
  const v3Recommended = shouldRecommendFullGate({
    risk,
    exclusiveConflict: exclusiveConflict(zones, zonesConfig.exclusiveWriteGroups),
    selectedZoneCount: zones.length,
  });

  return {
    schemaVersion: CHANGE_INSPECTION_SCHEMA,
    baseSha,
    headSha,
    changedPaths,
    zones,
    primaryZone: primaryZone(resolution.selected),
    risk,
    authorityImpact: authorityImpact(changedPaths),
    skills,
    mustRead: reads.mustRead,
    mayRead: reads.mayRead,
    allowedWrite: [...new Set(allowedWrite)].toSorted((a, b) => a.localeCompare(b, "en")),
    relevantFindings: findings,
    verification: {
      requiredTier: tier,
      commands: derived.commands,
      notes: derived.notes,
      v3Recommended,
    },
    unmatchedPaths: resolution.unmatched,
    ignoredPaths: resolution.ignored,
  };
}
