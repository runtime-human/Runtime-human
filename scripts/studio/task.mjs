import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { OPEN_LEDGER, parseArgs, readJsonl } from "./findings-lib.mjs";
import { runProcess } from "./harness-lib.mjs";
import {
  TASK_ENVELOPE_SCHEMA,
  buildReadLists,
  classifyRisk,
  deriveVerification,
  isIgnoredPath,
  isValidRisk,
  isValidTier,
  resolveZones,
  selectRelevantFindings,
  selectSkills,
  toPosix,
} from "./context-lib.mjs";

const root = process.cwd();
const errors = [];
const warnings = [];

function failUsage(message) {
  console.error(message);
  process.exit(2);
}

function readJsonConfig(path) {
  const full = resolve(root, path);
  if (!existsSync(full)) {
    errors.push(`missing ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (error) {
    errors.push(`invalid JSON ${path}: ${error.message}`);
    return null;
  }
}

function git(args) {
  const result = runProcess(["git", ...args], { cwd: root, encoding: "utf8" });
  if (result.error) {
    errors.push(`git ${args.join(" ")} failed: ${result.error.message}`);
    return null;
  }
  if (result.status !== 0) {
    errors.push(`git ${args.join(" ")} exited ${result.status}: ${(result.stderr ?? "").trim()}`);
    return null;
  }
  return result.stdout ?? "";
}

function revParse(ref) {
  const output = git(["rev-parse", ref]);
  return output ? output.trim().split(/\r?\n/)[0] : null;
}

function parseTaskFile(path) {
  const full = resolve(root, path);
  if (!existsSync(full)) {
    errors.push(`missing task file ${path}`);
    return {};
  }
  const text = readFileSync(full, "utf8");
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(Task|Objective|Zone|Risk|Notes)\s*:\s*(.+)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      fields[key] = fields[key] ? `${fields[key]}\n${match[2].trim()}` : match[2].trim();
    }
  }
  return fields;
}

const args = parseArgs(process.argv.slice(2));
const usageMessage =
  'Usage: pnpm studio:task -- (--id <taskId> | --task-file <path> with a Task line) [--diff <base-ref>|--base <ref>] [--head <ref>] [--task "text"] [--zone <id>]... [--risk <R>] [--tier V0..V4] [--json]';
const tier = args.one("tier") ?? "V1";
if (!isValidTier(tier)) failUsage(`Unknown verification tier: ${tier}`);

const zonesConfig = readJsonConfig(".studio/zones.json");
const contextMap = readJsonConfig(".studio/context-map.json");
const skillMap = readJsonConfig(".studio/skill-map.json");
if (!zonesConfig || !contextMap || !skillMap) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const zoneDeclarations = zonesConfig.zones ?? [];
const knownZoneIds = new Set(zoneDeclarations.map((zone) => zone.id));
const taskFileFields = args.one("task-file") ? parseTaskFile(args.one("task-file")) : {};
const explicitId = args.one("id");
const fromFileId = String(taskFileFields.task ?? "").match(/\b[A-Za-z]{2,}-[A-Za-z0-9._-]+\b/);
const taskId = explicitId ?? fromFileId?.[0] ?? null;
if (!taskId) failUsage(usageMessage);
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(taskId)) failUsage(`Invalid task id: ${taskId}`);

for (const overrideZone of args.many("zone")) {
  if (!knownZoneIds.has(overrideZone)) errors.push(`unknown --zone override: ${overrideZone}`);
}
const riskOverride = args.one("risk") ?? taskFileFields.risk ?? null;
if (riskOverride && !isValidRisk(riskOverride)) failUsage(`Unknown risk: ${riskOverride}`);
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const explicitBase = args.one("base") ?? args.one("diff");
const headRef = args.one("head");
const baseLabel = explicitBase ?? "HEAD";
const changedRaw = [];
if (explicitBase) {
  const diffOutput = git(["diff", "--name-only", "-z", baseLabel]);
  if (diffOutput !== null) changedRaw.push(...diffOutput.split("\0").filter(Boolean));
} else {
  const diffOutput = git(["diff", "--name-only", "-z", "HEAD"]);
  if (diffOutput !== null) changedRaw.push(...diffOutput.split("\0").filter(Boolean));
}
const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]);
if (untracked !== null) changedRaw.push(...untracked.split("\0").filter(Boolean));

const baseSha = revParse(baseLabel);
const headSha = revParse(headRef ?? "HEAD");
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const changedPosix = [...new Set(changedRaw.map(toPosix))];
const neverBulkLoad = contextMap.policy?.neverBulkLoad ?? [];
const resolution = resolveZones(changedPosix, zoneDeclarations, {
  fallbackZone: "tooling",
  neverBulkLoad,
});
const selectedZones = resolution.selected;
const selectedIds = selectedZones.map((entry) => entry.id);
for (const overrideZone of args.many("zone")) {
  if (!selectedIds.includes(overrideZone)) {
    selectedIds.push(overrideZone);
    selectedZones.push({ id: overrideZone, matched: [] });
  }
}
const unmatchedCount = resolution.unmatched.length;
if (unmatchedCount > 0) {
  warnings.push(`${unmatchedCount} changed path(s) matched no zone glob and fell back to tooling`);
}
const plannedZones = selectedIds.filter((zoneId) =>
  (skillMap.skills ?? []).some(
    (entry) => entry.name === `runtime-${zoneId}` && entry.status === "planned",
  ),
);
if (plannedZones.length > 0) {
  warnings.push(`planned zones touched without dedicated skills yet: ${plannedZones.join(", ")}`);
}
for (const group of zonesConfig.exclusiveWriteGroups ?? []) {
  const hits = group.filter((zoneId) => selectedIds.includes(zoneId));
  if (hits.length > 1)
    warnings.push(`exclusive write group touched by multiple zones: ${hits.join(" + ")}`);
}

const objectiveParts = [args.one("task"), taskFileFields.objective, taskFileFields.notes]
  .filter(Boolean)
  .join("\n");
const riskClassification = classifyRisk(selectedIds, zoneDeclarations, {
  taskText: objectiveParts,
  changedPaths: resolution.selected.flatMap((entry) => entry.matched),
  overrideRisk: riskOverride,
});
const risk = riskClassification.risk;
if (riskClassification.promoted) warnings.push("risk promoted to R3 by promoteToR3On keywords");

const skills = selectSkills(selectedIds, risk, skillMap.skills ?? []);
if (skills.length === 0) warnings.push("no active skill matches; falling back outside skill-map");

const guides = [];
for (const zoneId of selectedIds) {
  const guide = contextMap.zones?.[zoneId]?.agentGuide;
  if (guide && !guides.includes(guide)) {
    if (existsSync(resolve(root, guide))) guides.push(guide);
    else warnings.push(`agentGuide missing on disk: ${guide}`);
  }
}
const baseDocs = (contextMap.base ?? ["AGENTS.md", "GAME.md"]).filter((doc) =>
  existsSync(resolve(root, doc)),
);
const existingChanged = changedPosix.filter(
  (candidate) => existsSync(resolve(root, candidate)) && !isIgnoredPath(candidate, neverBulkLoad),
);
const lists = buildReadLists({
  base: baseDocs,
  guides,
  changedExisting: existingChanged,
  policy: {
    maxInitialDocs: contextMap.policy?.maxInitialDocs ?? 5,
    maxInitialFiles: contextMap.policy?.maxInitialFiles ?? 8,
  },
});

let findings = [];
try {
  findings = readJsonl(resolve(root, OPEN_LEDGER));
} catch (error) {
  warnings.push(`finding ledger unreadable: ${error.message}`);
}
const historicalFindings = selectRelevantFindings(
  findings,
  { zoneIds: selectedIds, changedPaths: existingChanged, taskText: objectiveParts },
  3,
);

const allowedWriteSet = [];
for (const zoneId of selectedIds) {
  const declaration = zoneDeclarations.find((zone) => zone.id === zoneId);
  for (const pattern of declaration?.paths ?? []) {
    if (!allowedWriteSet.includes(pattern)) allowedWriteSet.push(pattern);
  }
}
const forbiddenWrite = [".studio/findings/**"];
for (const group of zonesConfig.exclusiveWriteGroups ?? []) {
  if (!group.some((zoneId) => selectedIds.includes(zoneId))) continue;
  for (const otherZoneId of group) {
    if (selectedIds.includes(otherZoneId)) continue;
    const declaration = zoneDeclarations.find((zone) => zone.id === otherZoneId);
    for (const pattern of declaration?.paths ?? []) {
      if (!forbiddenWrite.includes(pattern)) forbiddenWrite.push(pattern);
    }
  }
}

const primarySelection = selectedZones.toSorted(
  (a, b) =>
    b.matched.length - a.matched.length || selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id),
)[0];
const verification = deriveVerification(selectedIds, existingChanged, tier);

const envelope = {
  schemaVersion: TASK_ENVELOPE_SCHEMA,
  taskId,
  base: { ref: baseLabel, sha: baseSha },
  head: { ref: headRef ?? "WORKTREE", sha: headSha, includesUncommitted: !headRef },
  objective: objectiveParts || null,
  zones: selectedIds,
  primaryZone: primarySelection?.id ?? null,
  risk,
  skills,
  mustRead: lists.mustRead,
  mayRead: lists.mayRead,
  allowedWrite: allowedWriteSet,
  forbiddenWrite,
  entities: [],
  historicalFindings,
  warnings,
  verification,
  stats: {
    changedFiles: changedPosix.length,
    ignoredFiles: resolution.ignored.length,
    consideredFiles: existingChanged.length,
    unmatchedFiles: unmatchedCount,
  },
};

const outPath = resolve(root, ".studio", "runtime", "tasks", String(taskId), "envelope.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

if (args.has("json")) {
  console.log(JSON.stringify(envelope, null, 2));
} else {
  console.log(`Task envelope: ${relative(root, outPath).split("\\").join("/")}`);
  console.log(
    `Task: ${taskId} | zones: ${envelope.zones.join(", ") || "none"} | primary: ${envelope.primaryZone ?? "none"} | risk: ${risk} | skills: ${skills.join(", ") || "none"}`,
  );
  console.log(
    `Diff: ${changedPosix.length} changed, ${resolution.ignored.length} ignored, ${existingChanged.length} considered`,
  );
  console.log(`Must read (${lists.mustRead.length}):`);
  for (const item of lists.mustRead.slice(0, 6)) console.log(`  - ${item}`);
  if (lists.mustRead.length > 6) console.log(`  ... +${lists.mustRead.length - 6} more`);
  if (lists.mayRead.length > 0)
    console.log(`May read (${lists.mayRead.length}): bounded list in envelope`);
  console.log(`Historical findings: ${historicalFindings.length}`);
  console.log(`Verification [${tier}]:`);
  for (const command of verification.commands) console.log(`  $ ${command}`);
  for (const warning of warnings) console.log(`! ${warning}`);
}
