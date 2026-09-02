import type { Fingerprint } from "./determinism";

export const SCENARIO_EXECUTION_POLICY_SCHEMA_VERSION = "scenario-execution-policy-v1" as const;
export const SCENARIO_CERTIFICATE_SCHEMA_VERSION = "scenario-certificate-v1" as const;

export type ScenarioExecutionPolicyV1 = Readonly<{
  schemaVersion: typeof SCENARIO_EXECUTION_POLICY_SCHEMA_VERSION;
  policyId: string;
  requireAcyclic: true;
  blockingDecisionsMax: number;
}>;

export type ScenarioCertificateV1 = Readonly<{
  schemaVersion: typeof SCENARIO_CERTIFICATE_SCHEMA_VERSION;
  programFingerprint: Fingerprint;
  policyId: string;
  policyFingerprint: Fingerprint;
  instructionCount: number;
  completionGuaranteed: true;
  bounded: true;
  transitionBudgetMax: number;
  blockingDecisionsMin: number;
  blockingDecisionsMax: number;
  providerCallsMax: number;
  rngCallsMax: number | "unknown";
  certificateFingerprint: Fingerprint;
}>;

export const MVP_CASUAL_SCENARIO_POLICY_V1: ScenarioExecutionPolicyV1 = Object.freeze({
  schemaVersion: SCENARIO_EXECUTION_POLICY_SCHEMA_VERSION,
  policyId: "mvp-casual-ordinary-month-v1",
  requireAcyclic: true,
  blockingDecisionsMax: 1,
});
