import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const POLICY_PATH = resolve(root, ".studio", "verification-policy.json");
const MODELS_PATH = resolve(root, ".studio", "models.json");
const SCHEMA_VERSION = "runtime-human-evaluator-plan-v1";
const RISK_RANK = Object.freeze({ R1: 1, R2: 2, R2_COMPLEX: 3, R3: 4 });

function fail(message) {
  console.error(message);
  console.error(
    "Usage: pnpm studio:evaluate -- --change-class <id> --risk <R1|R2|R2_COMPLEX|R3> [--json]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  const result = { changeClass: null, risk: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      result.json = true;
      continue;
    }
    if (arg === "--change-class") {
      result.changeClass = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--risk") {
      result.risk = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }
  if (!result.changeClass) fail("Missing --change-class");
  if (!result.risk) fail("Missing --risk");
  return result;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function maxRisk(requestedRisk, minimumRisk) {
  return RISK_RANK[requestedRisk] >= RISK_RANK[minimumRisk] ? requestedRisk : minimumRisk;
}

function resolveEvaluator(slot, profiles, models) {
  if (!slot || slot.mode === "none") return { mode: "none", profile: null };
  const profile = profiles[slot.profileRole];
  if (!profile || !models.profiles?.[profile]) {
    throw new Error(`Evaluator profile role ${slot.profileRole ?? "<none>"} is not resolvable`);
  }
  return { mode: slot.mode, profile };
}

function buildPlan(policy, models, changeClassId, requestedRisk) {
  const adaptive = policy.adaptiveReview;
  const changeClass = adaptive.changeClasses.find((entry) => entry.id === changeClassId);
  if (!changeClass) fail(`Unknown change class: ${changeClassId}`);
  if (!RISK_RANK[requestedRisk]) fail(`Unknown risk: ${requestedRisk}`);
  if (!RISK_RANK[changeClass.riskMinimum]) {
    throw new Error(`Invalid riskMinimum for ${changeClass.id}: ${changeClass.riskMinimum}`);
  }

  const effectiveRisk = maxRisk(requestedRisk, changeClass.riskMinimum);
  const elevated = effectiveRisk !== requestedRisk;
  let tester = resolveEvaluator(changeClass.tester, adaptive.evaluatorProfiles, models);
  let reviewer = resolveEvaluator(changeClass.reviewer, adaptive.evaluatorProfiles, models);
  const crossFamily = resolveEvaluator(changeClass.crossFamily, adaptive.evaluatorProfiles, models);
  const notes = [];

  if (effectiveRisk === "R3") {
    tester = {
      mode: "required",
      profile: adaptive.evaluatorProfiles.tester,
    };
    reviewer = {
      mode: "required",
      profile: adaptive.evaluatorProfiles.reviewerR3,
    };
    if (!models.profiles?.[tester.profile] || !models.profiles?.[reviewer.profile]) {
      throw new Error("Mandatory R3 evaluator profiles are not resolvable");
    }
    notes.push("R3 hard floor: independent tester plus fresh R3 reviewer are mandatory.");
  }

  if (adaptive.mode === "shadow") {
    notes.push(
      "Shadow mode only: this plan is advisory and cannot by itself skip an evaluator required by the current Producer contract.",
    );
  }

  if (changeClass.humanReview) notes.push("Human review/gate is required for this change class.");

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: adaptive.mode,
    enforceable: adaptive.mode === "active",
    changeClass: changeClass.id,
    requestedRisk,
    effectiveRisk,
    elevated,
    deterministicGate: changeClass.deterministicGate,
    tester,
    reviewer,
    crossFamily,
    humanReview: Boolean(changeClass.humanReview),
    notes,
  };
}

function renderText(plan) {
  const evaluator = (value) =>
    value.mode === "none" ? "none" : `${value.mode}:${value.profile ?? "<unresolved>"}`;
  return [
    `Evaluator plan (${plan.mode})`,
    `Class: ${plan.changeClass}`,
    `Risk: ${plan.requestedRisk}${plan.elevated ? ` -> ${plan.effectiveRisk}` : ""}`,
    `Gate: ${plan.deterministicGate}`,
    `Tester: ${evaluator(plan.tester)}`,
    `Reviewer: ${evaluator(plan.reviewer)}`,
    `Cross-family: ${evaluator(plan.crossFamily)}`,
    `Human review: ${plan.humanReview ? "required" : "no additional class gate"}`,
    ...plan.notes.map((note) => `Note: ${note}`),
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const policy = readJson(POLICY_PATH);
  const models = readJson(MODELS_PATH);
  const plan = buildPlan(policy, models, args.changeClass, args.risk);
  if (args.json) console.log(JSON.stringify(plan, null, 2));
  else console.log(renderText(plan));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
