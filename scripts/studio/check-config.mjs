import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  "orca.yaml",
  "opencode.json",
];
for (const path of required) assert(existsSync(resolve(root, path)), `missing ${path}`);

const project = readJson(".studio/project.json");
const models = readJson(".studio/models.json");
const zones = readJson(".studio/zones.json");
const context = readJson(".studio/context-map.json");
const opencode = readJson("opencode.json");

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
  assert(models.profiles?.escalation?.model === "opencode-go/glm-5.3", "Escalation must use GLM-5.3");
  assert(profileModels.every((model) => !model.includes("kimi")), "Kimi is forbidden in every active model profile");
  assert((models.forbiddenModels ?? []).some((model) => String(model).includes("kimi-k3")), "Kimi K3 must remain explicitly forbidden");
}

if (opencode) {
  assert(opencode.model === "opencode-go/deepseek-v4-flash", "OpenCode default model mismatch");
  assert(opencode.small_model === "opencode-go/mimo-v2.5", "OpenCode small_model mismatch");
  assert(opencode.subagent_depth === 0, "OpenCode subagent_depth must be 0 because Orca is the orchestrator");
  assert(opencode.permission?.task === "deny", "OpenCode task/subagent permission must be denied");
}

if (zones && context) {
  const zoneIds = (zones.zones ?? []).map((zone) => zone.id);
  assert(new Set(zoneIds).size === zoneIds.length, "zone ids must be unique");
  for (const zoneId of zoneIds) {
    assert(context.zones?.[zoneId], `context-map missing zone ${zoneId}`);
  }
  for (const zoneId of Object.keys(context.zones ?? {})) {
    assert(zoneIds.includes(zoneId), `context-map has unknown zone ${zoneId}`);
  }
}

if (errors.length) {
  console.error("Studio configuration invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Studio configuration OK");
