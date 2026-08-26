import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "./findings-lib.mjs";
import {
  AFFECTED_SCHEMA,
  classifyAffected,
  mergeProjectLists,
  runProcess,
  shouldRecommendFullGate,
} from "./harness-lib.mjs";
import { classifyRisk, isIgnoredPath, toPosix } from "./context-lib.mjs";

const root = process.cwd();
const errors = [];
const warnings = [];
const args = parseArgs(process.argv.slice(2));
if (args.has("help")) {
  console.log("Usage: pnpm studio:affected -- [--base <ref>|--diff <ref>] [--head <ref>] [--json]");
  process.exit(0);
}

function git(argsList) {
  const result = runProcess(["git", ...argsList], { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    errors.push(`git ${argsList.join(" ")} failed`);
    return "";
  }
  return result.stdout ?? "";
}

function revParse(ref) {
  const output = git(["rev-parse", ref]);
  return output ? output.trim().split(/\r?\n/)[0] : null;
}

let zonesConfig = null;
let contextMap = null;
try {
  zonesConfig = JSON.parse(readFileSync(resolve(root, ".studio/zones.json"), "utf8"));
} catch (error) {
  errors.push(`invalid .studio/zones.json: ${error.message}`);
}
try {
  contextMap = JSON.parse(readFileSync(resolve(root, ".studio/context-map.json"), "utf8"));
} catch (error) {
  errors.push(`invalid .studio/context-map.json: ${error.message}`);
}
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const explicitBase = args.one("base") ?? args.one("diff");
const headRef = args.one("head");
const baseLabel = explicitBase ?? "HEAD";
const changedRaw = [];
const diffOutput = git(["diff", "--name-only", "-z", baseLabel]);
changedRaw.push(...diffOutput.split("\0").filter(Boolean));
const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]);
changedRaw.push(...untracked.split("\0").filter(Boolean));
const baseSha = revParse(baseLabel);
const headSha = revParse(headRef ?? "HEAD");
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const changedPaths = [...new Set(changedRaw.map(toPosix))];
const classification = classifyAffected(changedPaths, zonesConfig, contextMap.policy ?? {});
const risk = classifyRisk(classification.zoneIds, zonesConfig.zones ?? [], {
  changedPaths,
}).risk;

let nxProjects = null;
let projectsSource = "zones";
if (args.has("nx")) {
  const nxBase = explicitBase ?? "origin/main";
  const nxResult = runProcess(
    ["pnpm", "exec", "nx", "show", "projects", "--affected", `--base=${nxBase}`, "--json"],
    { cwd: root, encoding: "utf8" },
  );
  if (nxResult.status === 0 && nxResult.stdout) {
    try {
      nxProjects = JSON.parse(nxResult.stdout);
      projectsSource = "zones+nx";
    } catch {
      warnings.push("nx show projects returned invalid JSON; using zone inference only");
    }
  } else {
    warnings.push("nx affected unavailable; using zone inference only");
  }
}
const projects = mergeProjectLists(classification.projects, nxProjects);

const fullGateRecommended = shouldRecommendFullGate({
  risk,
  exclusiveConflict: classification.exclusiveConflict,
  selectedZoneCount: classification.zoneIds.length,
});

const payloadWarnings = [...warnings];
if (classification.exclusiveConflict) {
  payloadWarnings.push("exclusive write group touched by multiple zones");
}
const payloadNotes =
  projectsSource === "zones+nx"
    ? ["projects merged from zone inference and `nx show projects --affected`."]
    : ["projects inferred from zone paths; pass --nx to merge the Nx affected graph."];

const payload = {
  schemaVersion: AFFECTED_SCHEMA,
  base: { ref: baseLabel, sha: baseSha },
  head: { ref: headRef ?? "WORKTREE", sha: headSha },
  projects,
  zones: classification.zoneIds,
  entities: [],
  tests: classification.tests,
  storybook: classification.storybook,
  rust: classification.rust,
  contentCompiler: classification.contentCompiler,
  fullGateRecommended,
  risk,
  projectsSource,
  warnings: payloadWarnings,
  notes: payloadNotes,
};

if (args.has("json")) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  const ignoredCount = changedPaths.filter((candidate) => isIgnoredPath(candidate)).length;
  console.log(`Affected: ${changedPaths.length} changed, ${ignoredCount} ignored`);
  console.log(`zones: ${classification.zoneIds.join(", ") || "none"}`);
  console.log(`projects (${projectsSource}): ${projects.join(", ") || "none"}`);
  if (payload.tests.length > 0) console.log(`tests: ${payload.tests.length}`);
  console.log(
    `storybook=${payload.storybook} rust=${payload.rust} contentCompiler=${payload.contentCompiler}`,
  );
  console.log(`fullGateRecommended=${fullGateRecommended} risk=${risk}`);
  for (const warning of payloadWarnings) console.log(`! ${warning}`);
}
