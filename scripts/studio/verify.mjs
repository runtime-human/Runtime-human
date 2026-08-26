import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "./findings-lib.mjs";
import {
  VERIFY_SCHEMA,
  buildTierCommands,
  classifyAffected,
  formatCompact,
  relativePosix,
  runCommand,
  shouldRecommendFullGate,
  summarizeText,
} from "./harness-lib.mjs";
import { classifyRisk, isValidTier, toPosix } from "./context-lib.mjs";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const tier = args.one("tier") ?? "V1";
if (!isValidTier(tier)) {
  console.error(`Unknown verification tier: ${tier}`);
  process.exit(2);
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(resolve(root, path), "utf8"));
  } catch (error) {
    console.error(`invalid ${path}: ${error.message}`);
    process.exit(1);
  }
}

function git(argsList) {
  const result = spawnSync("git", argsList, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) return "";
  return result.stdout ?? "";
}

const zonesConfig = loadJson(".studio/zones.json");
const contextMap = loadJson(".studio/context-map.json");
const baseLabel = args.one("base") ?? args.one("diff") ?? "HEAD";
const changedRaw = [
  ...git(["diff", "--name-only", "-z", baseLabel]).split("\0").filter(Boolean),
  ...git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean),
];
const changedPaths = [...new Set(changedRaw.map(toPosix))];
const classification = classifyAffected(changedPaths, zonesConfig, contextMap.policy ?? {});
for (const overrideZone of args.many("zone")) {
  if (!classification.zoneIds.includes(overrideZone)) classification.zoneIds.push(overrideZone);
}
const risk = classifyRisk(classification.zoneIds, zonesConfig.zones ?? [], { changedPaths }).risk;
const plan = buildTierCommands(tier, { ...classification, risk });
if (plan.commands === null) {
  for (const note of plan.notes) console.error(note);
  process.exit(2);
}
const fullGateRecommended = shouldRecommendFullGate({
  risk,
  exclusiveConflict: classification.exclusiveConflict,
  selectedZoneCount: classification.zoneIds.length,
});

const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
const logDir = resolve(root, ".studio", "runtime", "logs", `verify-${tier}-${runId}`);
mkdirSync(logDir, { recursive: true });

const results = [];
let failingCode = null;
for (const command of plan.commands) {
  const run = runCommand({ args: command, cwd: root, logDir });
  const summary = summarizeText(run.output);
  results.push({
    command: command.join(" "),
    ok: run.passed,
    code: run.code,
    durationMs: run.durationMs,
    log: relativePosix(root, run.logPath),
  });
  if (run.passed) {
    console.log(
      formatCompact({
        status: "PASS",
        name: command.join(" "),
        detail: "",
        logPath: relativePosix(root, run.logPath),
      }).join("\n"),
    );
  } else {
    console.log(
      formatCompact({
        status: "FAIL",
        name: command.join(" "),
        detail:
          summary.failed !== null
            ? `${summary.failed} failed${summary.total !== null ? ` / ${summary.total}` : ""}`
            : `exit ${run.code}`,
        excerpts: summary.excerpts.slice(0, 3),
        logPath: relativePosix(root, run.logPath),
      }).join("\n"),
    );
    failingCode = run.code;
    if (!args.has("keep-going")) break;
  }
}

const passed = results.filter((result) => result.ok).length;
console.log(`VERIFY [${tier}]: ${passed}/${results.length} commands ok`);
for (const note of plan.notes) console.log(`note: ${note}`);
if (fullGateRecommended)
  console.log("note: full gate recommended before merge (risk/zone breadth)");

if (args.has("json")) {
  console.log(
    JSON.stringify(
      {
        schemaVersion: VERIFY_SCHEMA,
        tier,
        risk,
        fullGateRecommended,
        notes: plan.notes,
        results,
        passed,
        total: results.length,
      },
      null,
      2,
    ),
  );
}
process.exit(failingCode ?? 0);
