import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const values = new Map();
let review = false;
let test = false;
let crossFamily = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--review") {
    review = true;
    continue;
  }
  if (arg === "--test") {
    test = true;
    continue;
  }
  if (arg === "--cross-family") {
    crossFamily = true;
    continue;
  }
  if (arg?.startsWith("--")) {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error(`Missing value for ${arg}`);
      process.exit(2);
    }
    values.set(arg.slice(2), value);
    index += 1;
  }
}

if (review && test) {
  console.error("Choose only one evaluation mode: --review or --test");
  process.exit(2);
}
if (crossFamily && !review) {
  console.error("--cross-family is only valid with --review");
  process.exit(2);
}

const zoneId = values.get("zone");
const requestedRisk = values.get("risk");
if (!zoneId || !requestedRisk) {
  console.error(
    "Usage: pnpm studio:route -- --zone <zone> --risk <R1|R2|R2_COMPLEX|R3> [--review [--cross-family]|--test]",
  );
  process.exit(2);
}

const root = process.cwd();
const models = JSON.parse(readFileSync(resolve(root, ".studio/models.json"), "utf8"));
const zones = JSON.parse(readFileSync(resolve(root, ".studio/zones.json"), "utf8"));
const zone = zones.zones.find((candidate) => candidate.id === zoneId);
if (!zone) {
  console.error(`Unknown Studio zone: ${zoneId}`);
  process.exit(2);
}

const riskRank = new Map([
  ["R1", 1],
  ["R2", 2],
  ["R2_COMPLEX", 3],
  ["R3", 4],
]);
if (!riskRank.has(requestedRisk)) {
  console.error(`Unknown risk: ${requestedRisk}`);
  process.exit(2);
}
if (!riskRank.has(zone.minimumRisk)) {
  console.error(`Invalid minimumRisk for zone ${zoneId}: ${zone.minimumRisk}`);
  process.exit(2);
}

const effectiveRisk =
  riskRank.get(requestedRisk) >= riskRank.get(zone.minimumRisk) ? requestedRisk : zone.minimumRisk;

const mode = review ? "review" : test ? "test" : "implement";
let profileKey;

if (review) {
  profileKey = crossFamily
    ? models.reviewRouting?.CROSS_FAMILY
    : models.reviewRouting?.[effectiveRisk];
} else if (test) {
  profileKey = models.testRouting?.[effectiveRisk] ?? models.testRouting?.default;
} else if (effectiveRisk === "R3") {
  profileKey = "riskR3";
} else if (zone.preferredProfile) {
  profileKey = zone.preferredProfile;
} else if (zoneId === "canon") {
  profileKey = "r2Complex";
} else if (zoneId === "qa-performance") {
  profileKey = "qa";
} else if (effectiveRisk === "R2_COMPLEX") {
  profileKey = "r2Complex";
} else {
  profileKey = models.routing[effectiveRisk];
}

const profile = models.profiles[profileKey];
if (!profile) {
  console.error(`Missing model profile: ${profileKey}`);
  process.exit(2);
}

console.log(
  JSON.stringify(
    {
      zone: zoneId,
      requestedRisk,
      effectiveRisk,
      elevated: effectiveRisk !== requestedRisk,
      mode,
      review,
      test,
      crossFamily,
      profile: profileKey,
      provider: profile.provider,
      model: profile.model,
      reasoningEffort: profile.reasoningEffort ?? null,
      readOnly: profile.readOnly ?? false,
      freshContext: profile.freshContext ?? false,
    },
    null,
    2,
  ),
);
