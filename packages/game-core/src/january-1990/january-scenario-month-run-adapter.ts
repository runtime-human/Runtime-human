import type {
  Fingerprint,
  MonthRunCheckpointV1,
  ScenarioArtifactV1,
  ScenarioCertificateV1,
  ScenarioProgramV1,
  ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";

import { canonicalizeAuthoritative } from "../determinism/authoritative-json";
import { fingerprint } from "../determinism/hash";
import type { MonthRunStep } from "../month-run/runner";
import type { January1990BalanceV1 } from "./january-balance";
import type { January1990ContentContext } from "./january-content-context";
import { createJanuary1990MonthSteps as createUncheckedJanuary1990MonthSteps } from "./january-month-steps";
import { parseJanuary1990MonthPlan } from "./january-month-plan";
import {
  createJanuary1990RulesFingerprintForExecutionProfile,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "./january-rng-execution-profile";

const JANUARY_SCENARIO_RUNTIME_RULES_NAMESPACE = "january-1990-scenario-runtime-rules-v1";

const SOURCE_FINGERPRINT =
  "162e470476ad0bd32194ee68dfdac80e14092b04c5b44a668315c47887a8117f" as Fingerprint;
const PROGRAM_FINGERPRINT =
  "1581cd05caff76175c31c28f100f8cce8dc2da467586ff0db39e6897b6cb40b0" as Fingerprint;
const RULES_FINGERPRINT =
  "5b2b4b434450e14050df032d4d59c30e48c01a44ec98f416d3421038c899be1a" as Fingerprint;
const POLICY_FINGERPRINT =
  "4263f3937d962c8238b142358311d3a4b3e8fe51c8d79d1747a49cba1054483b" as Fingerprint;
const CERTIFICATE_FINGERPRINT =
  "43650b303c0983f26e555352a45358ff1d1ee2f4f14da0ccf6b625bd36b1aa0c" as Fingerprint;

const EXPECTED_PROGRAM: ScenarioProgramV1 = Object.freeze({
  schemaVersion: "scenario-program-v1",
  scenarioId: "january-1990.shadow-proof",
  entryPc: 0,
  instructions: Object.freeze([
    Object.freeze({ op: "decision", decisionId: "january-1990/access", nextPc: 1 }),
    Object.freeze({ op: "provider", providerIndex: 0, nextPc: 2 }),
    Object.freeze({ op: "decision", decisionId: "january-1990/learning", nextPc: 3 }),
    Object.freeze({ op: "provider", providerIndex: 2, nextPc: 4 }),
    Object.freeze({ op: "random-content", contentPoolIndex: 0, nextPc: 5 }),
    Object.freeze({ op: "decision", decisionId: "january-1990/defect", nextPc: 6 }),
    Object.freeze({ op: "provider", providerIndex: 1, nextPc: 7 }),
    Object.freeze({ op: "complete" }),
  ]),
  providerTable: Object.freeze([
    "january-1990.access-materialize",
    "january-1990.programming-outcome",
    "january-1990.work-materialize",
  ]),
  predicateTable: Object.freeze([]),
  contentPoolTable: Object.freeze(["january-1990.defect-events"]),
  sourceFingerprint: SOURCE_FINGERPRINT,
  programFingerprint: PROGRAM_FINGERPRINT,
});

const EXPECTED_CAPABILITIES: ScenarioResolvedCapabilitiesV1 = Object.freeze({
  schemaVersion: "scenario-resolved-capabilities-v1",
  programFingerprint: PROGRAM_FINGERPRINT,
  providers: Object.freeze([
    Object.freeze({
      id: "january-1990.access-materialize",
      version: 1,
      deterministic: true,
      rngBudgetMax: 0,
      effectDomain: "progression",
    }),
    Object.freeze({
      id: "january-1990.programming-outcome",
      version: 1,
      deterministic: true,
      rngBudgetMax: 1,
      effectDomain: "project",
    }),
    Object.freeze({
      id: "january-1990.work-materialize",
      version: 1,
      deterministic: true,
      rngBudgetMax: 0,
      effectDomain: "learning",
    }),
  ]),
  predicates: Object.freeze([]),
  randomContentRngBudgetPerInstruction: 1,
  rulesFingerprint: RULES_FINGERPRINT,
});

const EXPECTED_CERTIFICATE: ScenarioCertificateV1 = Object.freeze({
  schemaVersion: "scenario-certificate-v1",
  programFingerprint: PROGRAM_FINGERPRINT,
  policyId: "january-1990-shadow-proof-v1",
  policyFingerprint: POLICY_FINGERPRINT,
  rulesFingerprint: RULES_FINGERPRINT,
  instructionCount: 8,
  completionGuaranteed: true,
  bounded: true,
  transitionBudgetMax: 8,
  blockingDecisionsMin: 3,
  blockingDecisionsMax: 3,
  providerCallsMax: 3,
  rngCallsMax: 2,
  certificateFingerprint: CERTIFICATE_FINGERPRINT,
});

export function assertJanuary1990ScenarioRuntimeArtifactV1(
  artifact: ScenarioArtifactV1,
): void {
  if (artifact.schemaVersion !== "scenario-artifact-v1") {
    throw new TypeError("January scenario runtime requires scenario-artifact-v1");
  }
  assertCanonicalIdentity(artifact.program, EXPECTED_PROGRAM, "program");
  assertCanonicalIdentity(artifact.capabilities, EXPECTED_CAPABILITIES, "capabilities");
  assertCanonicalIdentity(artifact.certificate, EXPECTED_CERTIFICATE, "certificate");
}

export function createJanuary1990ScenarioRuntimeRulesFingerprint(
  balance: January1990BalanceV1,
  artifact: ScenarioArtifactV1,
): Fingerprint {
  assertJanuary1990ScenarioRuntimeArtifactV1(artifact);
  return fingerprint(JANUARY_SCENARIO_RUNTIME_RULES_NAMESPACE, {
    januaryRulesFingerprint: createJanuary1990RulesFingerprintForExecutionProfile(
      balance,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    ),
    scenarioProgramFingerprint: artifact.program.programFingerprint,
    scenarioRulesFingerprint: artifact.capabilities.rulesFingerprint,
    scenarioPolicyFingerprint: artifact.certificate.policyFingerprint,
    scenarioCertificateFingerprint: artifact.certificate.certificateFingerprint,
  });
}

export function createJanuary1990ScenarioMonthSteps(
  context: January1990ContentContext,
  balance: January1990BalanceV1,
  artifact: ScenarioArtifactV1,
): readonly MonthRunStep[] {
  assertJanuary1990ScenarioRuntimeArtifactV1(artifact);
  const expectedRulesFingerprint = createJanuary1990ScenarioRuntimeRulesFingerprint(balance, artifact);
  const authoritativeSteps = createUncheckedJanuary1990MonthSteps(context, balance, "hierarchical-v1");
  if (authoritativeSteps.length !== artifact.program.instructions.length + 1) {
    throw new TypeError("January scenario adapter does not match the authoritative MonthRun step table");
  }

  return Object.freeze(
    authoritativeSteps.map((step) => (checkpoint: MonthRunCheckpointV1) => {
      validateScenarioCheckpoint(context, checkpoint, expectedRulesFingerprint);
      return step(checkpoint);
    }),
  );
}

function validateScenarioCheckpoint(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
  expectedRulesFingerprint: Fingerprint,
): void {
  const plan = parseJanuary1990MonthPlan(checkpoint.plan);
  if (
    plan.contentFingerprint !== context.contentFingerprint ||
    checkpoint.compatibility.contentFingerprint !== context.contentFingerprint
  ) {
    throw new TypeError("January scenario MonthRun content fingerprint is incompatible");
  }
  if (checkpoint.compatibility.rulesFingerprint !== expectedRulesFingerprint) {
    throw new TypeError("January scenario MonthRun rules fingerprint is incompatible");
  }
}

function assertCanonicalIdentity(actual: unknown, expected: unknown, subject: string): void {
  if (canonicalizeAuthoritative(actual) !== canonicalizeAuthoritative(expected)) {
    throw new TypeError(`January scenario runtime ${subject} identity is unsupported`);
  }
}
