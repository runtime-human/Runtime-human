import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { RISK_RANK, resolveZones } from "./context-lib.mjs";

export const AFFECTED_SCHEMA = "runtime-human-affected-v1";
export const VERIFY_SCHEMA = "runtime-human-verify-v1";

export function sanitizeLogName(args) {
  const base = args
    .map((arg) => String(arg))
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const digest = createHash("sha256")
    .update(args.map((arg) => String(arg)).join("\u0000"))
    .digest("hex");
  return `${base || "command"}-${digest.slice(0, 8)}.log`;
}

const FAILURE_MARKER = /(✗|×|\bFAIL\b|AssertionError|Error:)/;

export function summarizeText(text, options = {}) {
  const { maxFailures = 3, maxLines = 6 } = options;
  const source = String(text ?? "");
  const lines = source.split(/\r?\n/);
  let total = null;
  for (const line of lines) {
    if (!/\btests?\b|\bpassed\b|\bfailed\b/i.test(line)) continue;
    const parenthesized = line.match(/\((\d+)\)\s*$/);
    if (parenthesized) total = Math.max(total ?? 0, Number(parenthesized[1]));
  }
  for (const match of source.matchAll(/\b(\d+)\s*(?:tests?|passed)\b/gi)) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) total = Math.max(total ?? 0, value);
  }
  const failedMatch = source.match(/\b(\d+)\s*failed\b/i);
  const failed = failedMatch ? Number(failedMatch[1]) : null;
  const excerpts = [];
  let coveredUntil = -1;
  for (let index = 0; index < lines.length && excerpts.length < maxFailures; index += 1) {
    if (index <= coveredUntil || !FAILURE_MARKER.test(lines[index])) continue;
    let end = index;
    while (
      end < lines.length &&
      end - index < maxLines &&
      (end === index || lines[end].trim() !== "")
    ) {
      end += 1;
    }
    excerpts.push(`${excerpts.length + 1}) ${lines.slice(index, end).join("\n").trimEnd()}`);
    coveredUntil = end - 1;
    index = end - 1;
  }
  if (excerpts.length === 0) {
    const tail = lines.filter((line) => line.trim() !== "").slice(-maxLines);
    if (tail.length > 0) excerpts.push(`1) ${tail.join("\n")}`);
  }
  return { total, failed, excerpts };
}

export function formatCompact({ status, name, detail, excerpts = [], logPath }) {
  const out = [`${status} ${name}`];
  if (detail) out.push(detail);
  if (status === "FAIL") {
    out.push("");
    for (const excerpt of excerpts) {
      out.push(excerpt);
      out.push("");
    }
  }
  out.push(`log: ${logPath}`);
  return out;
}

export function runProcess(args, options = {}) {
  const normalized = args.map((arg) => String(arg));
  const useShell = process.platform === "win32";
  return useShell
    ? spawnSync(normalized.join(" "), { ...options, shell: true })
    : spawnSync(normalized[0], normalized.slice(1), { ...options, shell: false });
}

export function runCommand({ args, cwd = process.cwd(), logDir }) {
  const startedAt = Date.now();
  mkdirSync(logDir, { recursive: true });
  const logPath = resolve(logDir, sanitizeLogName(args));
  const result = runProcess(args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;
  if (result.error) {
    return {
      code: 5,
      durationMs,
      logPath,
      passed: false,
      output: result.error.message,
      spawnError: true,
    };
  }
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const output = stdout && stderr ? `${stdout}\n${stderr}` : `${stdout}${stderr}`;
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, output, "utf8");
  const code = typeof result.status === "number" ? result.status : 5;
  return { code, durationMs, logPath, passed: code === 0, output };
}

const ZONE_PROJECTS = Object.freeze({
  core: ["@runtime-human/shared-kernel", "@runtime-human/game-schema", "@runtime-human/game-core"],
  persistence: [
    "@runtime-human/game-persistence-contracts",
    "@runtime-human/game-platform-contracts",
    "desktop-rust",
  ],
  content: ["@runtime-human/game-content", "@runtime-human/game-content-compiler"],
  application: ["@runtime-human/game-application"],
  ui: ["@runtime-human/game-ui", "@runtime-human/game-ui-fixtures", "desktop-renderer"],
  "qa-performance": [],
  canon: [],
  balance: [],
  scenario: [],
  simulation: [],
  tooling: [],
});

export function classifyAffected(changedPaths, zonesConfig, contextMapPolicy = {}) {
  const neverBulkLoad = contextMapPolicy.neverBulkLoad ?? [];
  const candidates = changedPaths.map((value) => String(value).replaceAll("\\", "/"));
  const resolution = resolveZones(candidates, zonesConfig.zones ?? [], {
    fallbackZone: "tooling",
    neverBulkLoad,
  });
  const zoneIds = resolution.selected.map((entry) => entry.id);
  const considered = candidates.filter((candidate) => !resolution.ignored.includes(candidate));
  const tests = considered
    .filter((candidate) => /\.(test|spec)\.(ts|tsx)$/.test(candidate))
    .toSorted((a, b) => a.localeCompare(b, "en"));
  const projects = [];
  for (const zoneId of zoneIds) {
    for (const project of ZONE_PROJECTS[zoneId] ?? []) {
      if (!projects.includes(project)) projects.push(project);
    }
  }
  const exclusiveConflict = (zonesConfig.exclusiveWriteGroups ?? []).some((group) => {
    const hits = group.filter((zoneId) => zoneIds.includes(zoneId));
    return hits.length > 1;
  });
  return {
    resolution,
    zoneIds,
    projects,
    tests,
    storybook:
      zoneIds.includes("ui") &&
      considered.some(
        (candidate) => /\.stories\.tsx?$/.test(candidate) || candidate.includes(".storybook/"),
      ),
    rust:
      zoneIds.includes("persistence") ||
      considered.some((candidate) => candidate.startsWith("apps/desktop/src-tauri/")),
    contentCompiler:
      zoneIds.some((zoneId) => ["content", "scenario", "balance"].includes(zoneId)) ||
      considered.some(
        (candidate) => candidate.startsWith("content/") || candidate.startsWith("balance/"),
      ),
    exclusiveConflict,
  };
}

export function shouldRecommendFullGate({ risk, exclusiveConflict, selectedZoneCount }) {
  if ((RISK_RANK[risk] ?? 0) >= RISK_RANK.R3) return true;
  if (exclusiveConflict) return true;
  return selectedZoneCount > 3;
}

export function mergeProjectLists(primary, secondary) {
  const merged = [...(primary ?? [])];
  for (const project of [...(secondary ?? [])].toSorted((a, b) => a.localeCompare(b, "en"))) {
    if (!merged.includes(String(project))) merged.push(String(project));
  }
  return merged;
}

export function buildTierCommands(tier, affected) {
  if (!["V0", "V1", "V2"].includes(tier)) {
    return {
      commands: null,
      notes: [
        "V3/V4 are serialized full gates: run `pnpm verify` / `pnpm verify:release` directly, one slot at a time.",
      ],
    };
  }
  const commands = [];
  const notes = [];
  const { zoneIds, tests, storybook, rust, contentCompiler } = affected;
  if (zoneIds.includes("tooling")) commands.push(["pnpm", "studio:check"]);
  if (zoneIds.includes("canon") || zoneIds.includes("qa-performance")) {
    commands.push(["pnpm", "docs:check"]);
  }
  if (contentCompiler) commands.push(["pnpm", "content:check"]);
  if (tests.length > 0) commands.push(["pnpm", "exec", "vitest", "run", ...tests.slice(0, 8)]);
  if (storybook) {
    notes.push(
      "Storybook browser harness is planned (Wave 4); add targeted interaction evidence manually.",
    );
  }
  if (
    zoneIds.some((zoneId) => ["core", "application", "simulation"].includes(zoneId)) &&
    tests.length === 0
  ) {
    commands.push(["pnpm", "exec", "vitest", "run", "tests"]);
  }
  if (tier !== "V0") {
    if (zoneIds.includes("core") || zoneIds.includes("application")) {
      commands.push(["pnpm", "typecheck"]);
    }
    if (rust) commands.push(["pnpm", "rust:fmt:check"]);
  }
  if (tier === "V2") {
    commands.unshift(["pnpm", "check:fast"]);
    if (rust) commands.push(["pnpm", "rust:check"]);
  }
  return { commands, notes };
}

export function relativePosix(from, to) {
  if (!existsSync(to)) return to;
  return relative(from, to).split("\\").join("/");
}
