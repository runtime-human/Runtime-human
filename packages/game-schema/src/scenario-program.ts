import type { Fingerprint } from "./determinism";

export const SCENARIO_PROGRAM_SCHEMA_VERSION = "scenario-program-v1" as const;

export type ScenarioDecisionInstructionV1 = Readonly<{
  op: "decision";
  decisionId: string;
  nextPc: number;
}>;

export type ScenarioProviderInstructionV1 = Readonly<{
  op: "provider";
  providerIndex: number;
  nextPc: number;
}>;

export type ScenarioRandomContentInstructionV1 = Readonly<{
  op: "random-content";
  contentPoolIndex: number;
  nextPc: number;
}>;

export type ScenarioGateInstructionV1 = Readonly<{
  op: "gate";
  predicateIndex: number;
  passPc: number;
  failPc: number;
}>;

export type ScenarioBranchCaseV1 = Readonly<{
  predicateIndex: number;
  targetPc: number;
}>;

export type ScenarioBranchInstructionV1 = Readonly<{
  op: "branch";
  branches: readonly ScenarioBranchCaseV1[];
  fallbackPc: number;
}>;

export type ScenarioCompleteInstructionV1 = Readonly<{
  op: "complete";
}>;

export type ScenarioInstructionV1 =
  | ScenarioDecisionInstructionV1
  | ScenarioProviderInstructionV1
  | ScenarioRandomContentInstructionV1
  | ScenarioGateInstructionV1
  | ScenarioBranchInstructionV1
  | ScenarioCompleteInstructionV1;

export type ScenarioProgramV1 = Readonly<{
  schemaVersion: typeof SCENARIO_PROGRAM_SCHEMA_VERSION;
  scenarioId: string;
  entryPc: number;
  instructions: readonly ScenarioInstructionV1[];
  providerTable: readonly string[];
  predicateTable: readonly string[];
  contentPoolTable: readonly string[];
  sourceFingerprint: Fingerprint;
  programFingerprint: Fingerprint;
}>;
