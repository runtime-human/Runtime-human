import type { Fingerprint } from "./determinism";

export const SCENARIO_CAPABILITY_REGISTRY_SCHEMA_VERSION =
  "scenario-capability-registry-v1" as const;
export const SCENARIO_RESOLVED_CAPABILITIES_SCHEMA_VERSION =
  "scenario-resolved-capabilities-v1" as const;

export type ScenarioProviderEffectDomainV1 =
  | "learning"
  | "project"
  | "npc"
  | "progression"
  | "narrative";

export type ScenarioProviderDescriptorV1 = Readonly<{
  id: string;
  version: number;
  deterministic: true;
  rngBudgetMax: number;
  effectDomain: ScenarioProviderEffectDomainV1;
}>;

export type ScenarioPredicateDescriptorV1 = Readonly<{
  id: string;
  version: number;
  deterministic: true;
  readOnly: true;
}>;

export type ScenarioCapabilityRegistryV1 = Readonly<{
  schemaVersion: typeof SCENARIO_CAPABILITY_REGISTRY_SCHEMA_VERSION;
  providers: readonly ScenarioProviderDescriptorV1[];
  predicates: readonly ScenarioPredicateDescriptorV1[];
}>;

export type ScenarioResolvedCapabilitiesV1 = Readonly<{
  schemaVersion: typeof SCENARIO_RESOLVED_CAPABILITIES_SCHEMA_VERSION;
  programFingerprint: Fingerprint;
  providers: readonly ScenarioProviderDescriptorV1[];
  predicates: readonly ScenarioPredicateDescriptorV1[];
  randomContentRngBudgetPerInstruction: number;
  rulesFingerprint: Fingerprint;
}>;
