import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OPEN_LEDGER, RESOLVED_LEDGER, readJsonl } from "./findings-lib.mjs";

const root = process.cwd();
const errors = [];

function readJson(path) {
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

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const required = [
  "GAME.md",
  "AGENTS.md",
  "gamestudio/START_PROMPT.md",
  "gamestudio/STUDIO.md",
  "gamestudio/ORCA.md",
  ".studio/producer.md",
  ".studio/task-contract.md",
  ".studio/finding-contract.md",
  ".studio/finding-policy.json",
  ".studio/review-artifacts.md",
  ".agents/skills/runtime-test/SKILL.md",
  ".agents/skills/runtime-review/SKILL.md",
  OPEN_LEDGER,
  RESOLVED_LEDGER,
  "scripts/studio/route.mjs",
  "scripts/studio/finding-add.mjs",
  "scripts/studio/findings-list.mjs",
  "scripts/studio/findings-cluster.mjs",
  "scripts/studio/findings-promote.mjs",
  "scripts/studio/finding-resolve.mjs",
  "orca.yaml",
  "opencode.json",
];
for (const path of required) assert(existsSync(resolve(root, path)), `missing ${path}`);

const project = readJson(".studio/project.json");
const models = readJson(".studio/models.json");
const zones = readJson(".studio/zones.json");
const context = readJson(".studio/context-map.json");
const findingPolicy = readJson(".studio/finding-policy.json");
const opencode = readJson("opencode.json");
const packageJson = readJson("package.json");

if (project) {
  assert(project.schemaVersion === 1, "project schemaVersion must be 1");
  assert(project.defaultBranch === "main", "Studio default branch must be main");
  assert(project.concurrency?.fullGateSlots === 1, "fullGateSlots must stay 1 on the local workstation");
  assert(project.producer?.ownerGate === true, "Producer ownerGate must be enabled");
}

if (models) {
  const profiles = Object.values(models.profiles ?? {});
  const profileModels = profiles.map((profile) => String(profile.model ?? "").toLowerCase());
  assert(models.profiles?.producer?.model === "gpt-5.6-sol", "Producer must use gpt-5.6-sol");
  assert(models.profiles?.riskR3?.model === "gpt-5.6-sol", "R3 must use gpt-5.6-sol");
  assert(models.profiles?.content?.model === "opencode-go/deepseek-v4-pro", "Content must use DeepSeek V4 Pro");
  assert(models.profiles?.defaultWorker?.model === "opencode-go/deepseek-v4-flash", "Default worker must use DeepSeek V4 Flash");
  assert(models.profiles?.lunaTester?.model === "gpt-5.6-luna", "Independent tester must use gpt-5.6-luna");
  assert(models.profiles?.lunaTester?.reasoningEffort === "xhigh", "Luna tester must use xhigh reasoning");
  assert(models.profiles?.lunaTester?.readOnly === true, "Luna tester must be read-only");
  assert(models.profiles?.lunaTester?.freshContext === true, "Luna tester must use fresh context");
  assert(models.profiles?.lunaReviewer?.model === "gpt-5.6-luna", "R1/R2 reviewer must use gpt-5.6-luna");
  assert(models.profiles?.lunaReviewer?.reasoningEffort === "xhigh", "Luna reviewer must use xhigh reasoning");
  assert(models.profiles?.lunaReviewer?.readOnly === true, "Luna reviewer must be read-only");
  assert(models.profiles?.lunaReviewer?.freshContext === true, "Luna reviewer must use fresh context");
  assert(models.profiles?.crossFamilyReviewer?.model === "opencode-go/glm-5.3", "Cross-family reviewer must use GLM-5.3");
  assert(models.profiles?.crossFamilyReviewer?.readOnly === true, "Cross-family reviewer must be read-only");
  assert(models.profiles?.crossFamilyReviewer?.freshContext === true, "Cross-family reviewer must use fresh context");
  assert(models.profiles?.r3Reviewer?.model === "gpt-5.6-sol", "R3 reviewer must use gpt-5.6-sol");
  assert(models.profiles?.r3Reviewer?.readOnly === true, "R3 reviewer must be read-only");
  assert(models.profiles?.r3Reviewer?.freshContext === true, "R3 reviewer must use fresh context");
  assert(models.profiles?.escalation?.model === "opencode-go/glm-5.3", "Escalation must use GLM-5.3");
  assert(profileModels.every((model) => !model.includes("kimi")), "Kimi is forbidden in every active model profile");
  assert((models.forbiddenModels ?? []).some((model) => String(model).includes("kimi-k3")), "Kimi K3 must remain explicitly forbidden");
  for (const [risk, profileKey] of Object.entries(models.routing ?? {})) {
    assert(Boolean(models.profiles?.[profileKey]), `routing ${risk} references missing profile ${profileKey}`);
  }
  for (const [risk, profileKey] of Object.entries(models.reviewRouting ?? {})) {
    assert(Boolean(models.profiles?.[profileKey]), `reviewRouting ${risk} references missing profile ${profileKey}`);
  }
  for (const [risk, profileKey] of Object.entries(models.testRouting ?? {})) {
    assert(Boolean(models.profiles?.[profileKey]), `testRouting ${risk} references missing profile ${profileKey}`);
  }
  assert(models.reviewRouting?.R1 === "lunaReviewer", "R1 review must route to Luna");
  assert(models.reviewRouting?.R2 === "lunaReviewer", "R2 review must route to Luna");
  assert(models.reviewRouting?.R2_COMPLEX === "lunaReviewer", "R2_COMPLEX review must route to Luna");
  assert(models.reviewRouting?.R3 === "r3Reviewer", "R3 review must stay on Sol");
  assert(models.reviewRouting?.CROSS_FAMILY === "crossFamilyReviewer", "Cross-family review routing mismatch");
  assert(models.testRouting?.default === "lunaTester", "Default independent testing must route to Luna");
}

if (opencode) {
  assert(opencode.model === "opencode-go/deepseek-v4-flash", "OpenCode default model mismatch");
  assert(opencode.small_model === "opencode-go/mimo-v2.5", "OpenCode small_model mismatch");
  assert(opencode.default_agent === "worker", "OpenCode default_agent must be worker");
  assert(opencode.subagent_depth === 0, "OpenCode subagent_depth must be 0 because Orca is the orchestrator");
  assert(opencode.share === "disabled", "OpenCode conversation sharing must stay disabled for this private project");
  assert(opencode.compaction?.auto === true, "OpenCode automatic compaction must be enabled");
  assert(opencode.compaction?.prune === true, "OpenCode old tool output pruning must be enabled for scoped workers");
  assert(opencode.permission?.task === "deny", "OpenCode task/subagent permission must be denied");
}

if (zones && context) {
  const validRisks = new Set(["R1", "R2", "R2_COMPLEX", "R3"]);
  const zoneIds = (zones.zones ?? []).map((zone) => zone.id);
  assert(new Set(zoneIds).size === zoneIds.length, "zone ids must be unique");
  for (const zone of zones.zones ?? []) {
    assert(validRisks.has(zone.minimumRisk), `zone ${zone.id} has invalid minimumRisk ${zone.minimumRisk}`);
    assert(context.zones?.[zone.id], `context-map missing zone ${zone.id}`);
    if (zone.preferredProfile && models) {
      assert(Boolean(models.profiles?.[zone.preferredProfile]), `zone ${zone.id} references missing profile ${zone.preferredProfile}`);
    }
  }
  for (const zoneId of Object.keys(context.zones ?? {})) {
    assert(zoneIds.includes(zoneId), `context-map has unknown zone ${zoneId}`);
  }
  for (const group of zones.exclusiveWriteGroups ?? []) {
    for (const zoneId of group) assert(zoneIds.includes(zoneId), `exclusiveWriteGroups references unknown zone ${zoneId}`);
  }
}

if (findingPolicy) {
  assert(findingPolicy.schemaVersion === 1, "finding policy schemaVersion must be 1");
  assert(
    ["S0", "S1", "S2", "S3", "S4"].every((severity) => findingPolicy.severity?.[severity]),
    "finding policy must define S0-S4",
  );
  assert(
    ["XS", "S", "M", "L", "XL"].every((size) => Number.isFinite(findingPolicy.sizeWeights?.[size])),
    "finding policy must define XS-XL size weights",
  );
  assert(findingPolicy.severity?.S0?.blocksAcceptance === true, "S0 must block acceptance");
  assert(findingPolicy.severity?.S1?.blocksAcceptance === true, "S1 must block acceptance");
  assert(findingPolicy.batch?.clusterMinFindings >= 2, "finding clusterMinFindings must be >= 2");
  assert(findingPolicy.batch?.readyScore > 0, "finding readyScore must be positive");
  assert(findingPolicy.promotion?.systemicOccurrenceThreshold >= 2, "systemic occurrence threshold must be >= 2");
  const open = new Set(findingPolicy.openDispositions ?? []);
  const closed = new Set(findingPolicy.closedDispositions ?? []);
  assert([...open].every((value) => !closed.has(value)), "open and closed finding dispositions must be disjoint");
}

for (const ledger of [OPEN_LEDGER, RESOLVED_LEDGER]) {
  if (!existsSync(resolve(root, ledger))) continue;
  try {
    readJsonl(resolve(root, ledger));
  } catch (error) {
    errors.push(error.message);
  }
}

if (packageJson) {
  for (const command of [
    "studio:finding:add",
    "studio:findings",
    "studio:findings:cluster",
    "studio:findings:promote",
    "studio:finding:resolve",
  ]) {
    assert(Boolean(packageJson.scripts?.[command]), `package.json missing ${command}`);
  }
}

if (errors.length) {
  console.error("Studio configuration invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Studio configuration OK");
