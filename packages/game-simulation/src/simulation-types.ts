import type {
  AuthoritativeJsonValue,
  DecisionId,
  Fingerprint,
  MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

export const SIMULATION_REPORT_SCHEMA_VERSION = "simulation-report-v1" as const;

export type SimulationPolicyIdV1 = "always-first-valid" | "learning-first" | "random-valid-v1";

export const SIMULATION_POLICY_IDS: readonly SimulationPolicyIdV1[] = [
  "always-first-valid",
  "learning-first",
  "random-valid-v1",
];

export type SimulationTerminalStateV1 = "completed" | "protocol-rejected" | "soft-lock";

export const REPRO_RUNNER_ID = "repro-v1" as const;
export type ReproRunnerIdV1 = typeof REPRO_RUNNER_ID;

export type SimulationInvariantIdV1 = "no-soft-lock" | "score-bounds" | "terminal-validity";

export type SimulationInvariantFailureV1 = Readonly<{
  invariant: SimulationInvariantIdV1;
  seed: string;
  policyId: string;
  detail: string;
}>;

export type SimulationChoiceDistributionV1 = Readonly<{
  accessRoute: Readonly<Record<string, number>>;
  learningPractice: Readonly<Record<string, number>>;
  defectResponse: Readonly<Record<string, number>>;
}>;

export type SimulationMetricSnapshotV1 = Readonly<{
  blockingDecisions: number;
  stateTransitions: number;
  qualityScores: Readonly<{
    clarity: number | null;
    correctness: number | null;
    reliability: number | null;
  }>;
  choices: SimulationChoiceDistributionV1;
}>;

export type SimulationRunResultV1 = Readonly<{
  seed: string;
  policyId: SimulationPolicyIdV1;
  terminalState: SimulationTerminalStateV1;
  metrics: SimulationMetricSnapshotV1;
}>;

export type SimulationAggregatesV1 = Readonly<{
  completedRuns: number;
  softLocks: number;
  terminalFailures: number;
  invalidStates: number;
  monthsPlayed: number;
  blockingDecisions: number;
  stateTransitions: number;
  scoreBounds: Readonly<{
    clarity: { minimum: number | null; maximum: number | null };
    correctness: { minimum: number | null; maximum: number | null };
    reliability: { minimum: number | null; maximum: number | null };
  }>;
  choiceDistribution: SimulationChoiceDistributionV1;
}>;

export type SimulationReportV1 = Readonly<{
  schemaVersion: typeof SIMULATION_REPORT_SCHEMA_VERSION;
  rulesetFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  policies: readonly SimulationPolicyIdV1[];
  seedRange: Readonly<{ start: number; end: number }>;
  runs: number;
  aggregates: SimulationAggregatesV1;
  invariantFailures: readonly SimulationInvariantFailureV1[];
}>;

export type SimulationRequestV1 = Readonly<{
  seedStart: number;
  seedEnd: number;
  policies: readonly SimulationPolicyIdV1[];
  captureFailures?: boolean;
}>;

export type JanuaryAnswerSelectionV1 = Readonly<{
  decisionId: DecisionId;
  kind: "january-access" | "january-learning" | "january-defect";
  answer: AuthoritativeJsonValue;
}>;

export type JanuaryAnswerSelectionArgumentsV1 = Readonly<{
  kind: JanuaryAnswerSelectionV1["kind"];
  seed: bigint;
  decisionIndex: number;
}>;

export type JanuarySimulationPolicyV1 = Readonly<{
  policyId: SimulationPolicyIdV1;
  selectAnswer(arguments_: JanuaryAnswerSelectionArgumentsV1): JanuaryAnswerSelectionV1["answer"];
}>;

export type JanuarySimulationTerminalRunV1 = Readonly<{
  seed: string;
  policyId: SimulationPolicyIdV1 | ReproRunnerIdV1;
  terminalState: SimulationTerminalStateV1;
  checkpoint: MonthRunCheckpointV1;
  metrics: SimulationMetricSnapshotV1;
}>;
