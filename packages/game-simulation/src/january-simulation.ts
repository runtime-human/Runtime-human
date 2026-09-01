import {
  createJanuary1990HierarchicalMonthSteps,
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprintForExecutionProfile,
  createMonthRunCheckpoint,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  runUntilBoundary,
  transitionMonthRun,
  Xoshiro256StarStar,
  type January1990BalanceV1,
  type January1990ContentContext,
  type January1990MonthPlanV1,
  type January1990RngExecutionProfileId,
  type JanuaryBalanceAccessRoute,
  type JanuaryBalanceDefectResponse,
  type JanuaryBalanceLearningPractice,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type AuthoritativeJsonValue,
  type DeterminismManifest,
  type Fingerprint,
  type MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

import {
  SIMULATION_POLICY_IDS,
  SIMULATION_REPORT_SCHEMA_VERSION,
  type JanuaryAnswerSelectionArgumentsV1,
  type JanuaryAnswerSelectionV1,
  type JanuarySimulationPolicyV1,
  type JanuarySimulationTerminalRunV1,
  type ReproRunnerIdV1,
  type SimulationAggregatesV1,
  type SimulationChoiceDistributionV1,
  type SimulationInvariantFailureV1,
  type SimulationMetricSnapshotV1,
  type SimulationPolicyIdV1,
  type SimulationReportV1,
  type SimulationRequestV1,
} from "./simulation-types";
import type { MonthRunStep } from "@runtime-human/game-core";

const MAX_DECISIONS_PER_RUN = 8;

export type CreateJanuary1990SimulationInput = Readonly<{
  context: January1990ContentContext;
  balance: January1990BalanceV1;
  saveSchemaFingerprint: Fingerprint;
  rngExecutionProfile?: January1990RngExecutionProfileId | undefined;
}>;

export type January1990Simulation = Readonly<{
  simulate(request: SimulationRequestV1): SimulationReportV1;
  runOnce(
    input: Readonly<{ seed: number; policyId: SimulationPolicyIdV1 }>,
  ): JanuarySimulationTerminalRunV1;
}>;

export function createJanuary1990Simulation(
  input: CreateJanuary1990SimulationInput,
): January1990Simulation {
  const context = input.context;
  const rngExecutionProfile =
    input.rngExecutionProfile ?? JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id;
  const hierarchical = rngExecutionProfile === JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id;
  const steps = hierarchical
    ? createJanuary1990HierarchicalMonthSteps(context, input.balance)
    : createJanuary1990MonthSteps(context, input.balance);
  const plan = createJanuary1990MonthPlan(context);
  const rulesetFingerprint = createJanuary1990RulesFingerprintForExecutionProfile(
    input.balance,
    rngExecutionProfile,
  );
  const determinismManifest = hierarchical
    ? JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST
    : DETERMINISM_MANIFEST_V1;

  return Object.freeze({
    simulate(request) {
      requireSeedRange(request.seedStart, request.seedEnd);
      requirePolicies(request.policies);

      const runs: JanuarySimulationTerminalRunV1[] = [];
      for (let seed = request.seedStart; seed <= request.seedEnd; seed += 1) {
        for (const policyId of request.policies) {
          runs.push(
            runJanuaryOnce({
              seed,
              policyId,
              contentFingerprint: context.contentFingerprint,
              steps,
              plan,
              rulesetFingerprint,
              determinismManifest,
              saveSchemaFingerprint: input.saveSchemaFingerprint,
            }),
          );
        }
      }

      return buildReport({
        request,
        runs,
        rulesetFingerprint,
        contentFingerprint: context.contentFingerprint,
      });
    },
    runOnce({ seed, policyId }) {
      return runJanuaryOnce({
        seed,
        policyId,
        contentFingerprint: context.contentFingerprint,
        steps,
        plan,
        rulesetFingerprint,
        determinismManifest,
        saveSchemaFingerprint: input.saveSchemaFingerprint,
      });
    },
  });
}

export type JanuaryAnswerProviderV1 = Readonly<{
  kind: JanuaryAnswerSelectionV1["kind"];
  provideAnswer(decisionIndex: number): AuthoritativeJsonValue;
}>;

export function runJanuaryCommandSequence(
  input: Readonly<{
    runnerId: SimulationPolicyIdV1 | ReproRunnerIdV1;
    seed: number;
    contentFingerprint: Fingerprint;
    steps: readonly MonthRunStep[];
    plan: January1990MonthPlanV1;
    rulesetFingerprint: Fingerprint;
    determinismManifest?: DeterminismManifest | undefined;
    saveSchemaFingerprint: Fingerprint;
    answers: readonly JanuaryAnswerProviderV1[];
  }>,
): JanuarySimulationTerminalRunV1 {
  let checkpoint = createMonthRunCheckpoint({
    runId: parseMonthRunId(`january-sim-${input.runnerId}-${input.seed}`),
    saveId: parseSaveId(`january-sim-save-${input.runnerId}-${input.seed}`),
    baseSaveRevision: parseSaveRevision(0),
    plan: input.plan,
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: input.rulesetFingerprint,
      contentFingerprint: input.contentFingerprint,
      saveSchemaFingerprint: input.saveSchemaFingerprint,
      determinismManifest: input.determinismManifest ?? DETERMINISM_MANIFEST_V1,
    },
    rngState: Xoshiro256StarStar.fromSeed(BigInt(input.seed)).exportState(),
  });

  let protocolError: string | null = null;
  let decisionIndex = 0;

  for (let iteration = 0; iteration < MAX_DECISIONS_PER_RUN * 2; iteration += 1) {
    if (input.steps[checkpoint.programCounter] === undefined) break;
    const result = runUntilBoundary(checkpoint, input.steps);
    if (result.kind === "rejected") {
      protocolError = result.error.code;
      checkpoint = result.checkpoint;
      break;
    }
    checkpoint = result.checkpoint;
    if (checkpoint.status === "completed") break;
    const pending = checkpoint.pendingDecision;
    if (pending === undefined || pending === null) break;

    const kind = januaryKind(pending.kind);
    const provider = input.answers.find((candidate) => candidate.kind === kind);
    if (provider === undefined) {
      protocolError = "MissingAnswerCommand";
      break;
    }
    const accepted = transitionMonthRun(checkpoint, {
      type: "accept-decision",
      requestId: parseRequestId(`sim-${input.runnerId}-${input.seed}-${kind}-${decisionIndex}`),
      decisionId: pending.decisionId,
      answer: provider.provideAnswer(decisionIndex),
    });
    if (accepted.kind === "accepted") {
      decisionIndex += 1;
      checkpoint = accepted.checkpoint;
      continue;
    }
    protocolError = accepted.kind === "rejected" ? accepted.error.code : "DuplicateTransition";
    break;
  }

  const terminalState =
    protocolError !== null
      ? "protocol-rejected"
      : checkpoint.status === "completed"
        ? "completed"
        : "soft-lock";

  return Object.freeze({
    seed: String(input.seed),
    policyId: input.runnerId,
    terminalState,
    checkpoint,
    metrics: buildMetrics(checkpoint, decisionIndex, terminalState),
  });
}

function runJanuaryOnce(
  input: Readonly<{
    seed: number;
    policyId: SimulationPolicyIdV1;
    contentFingerprint: Fingerprint;
    steps: readonly MonthRunStep[];
    plan: January1990MonthPlanV1;
    rulesetFingerprint: Fingerprint;
    determinismManifest: DeterminismManifest;
    saveSchemaFingerprint: Fingerprint;
  }>,
): JanuarySimulationTerminalRunV1 {
  return runJanuaryCommandSequence({
    runnerId: input.policyId,
    seed: input.seed,
    contentFingerprint: input.contentFingerprint,
    steps: input.steps,
    plan: input.plan,
    rulesetFingerprint: input.rulesetFingerprint,
    determinismManifest: input.determinismManifest,
    saveSchemaFingerprint: input.saveSchemaFingerprint,
    answers: policyAnswers(input.policyId, input.seed),
  });
}

export type JanuaryFixtureAnswersV1 = Readonly<{
  access?: JanuaryBalanceAccessRoute | undefined;
  learning?: JanuaryBalanceLearningPractice | undefined;
  response?: JanuaryBalanceDefectResponse | undefined;
}>;

export function createJanuary1990AnswerProviders(
  input: Readonly<{
    policyId: SimulationPolicyIdV1 | null;
    seed: number;
    fixtureAnswers: JanuaryFixtureAnswersV1;
  }>,
): readonly JanuaryAnswerProviderV1[] {
  const providers: JanuaryAnswerProviderV1[] = [];
  const fixtureAccess = input.fixtureAnswers.access;
  if (fixtureAccess !== undefined) {
    providers.push({
      kind: "january-access",
      provideAnswer: () => answer("route", fixtureAccess),
    });
  } else if (input.policyId !== null) {
    providers.push(policyProvider("january-access", input.policyId, input.seed));
  }
  const fixtureLearning = input.fixtureAnswers.learning;
  if (fixtureLearning !== undefined) {
    providers.push({
      kind: "january-learning",
      provideAnswer: () => answer("practice", fixtureLearning),
    });
  } else if (input.policyId !== null) {
    providers.push(policyProvider("january-learning", input.policyId, input.seed));
  }
  const fixtureResponse = input.fixtureAnswers.response;
  if (fixtureResponse !== undefined) {
    providers.push({
      kind: "january-defect",
      provideAnswer: () => answer("response", fixtureResponse),
    });
  } else if (input.policyId !== null) {
    providers.push(policyProvider("january-defect", input.policyId, input.seed));
  }
  return Object.freeze(providers);
}

function policyProvider(
  kind: JanuaryAnswerSelectionV1["kind"],
  policyId: SimulationPolicyIdV1,
  seed: number,
): JanuaryAnswerProviderV1 {
  return {
    kind,
    provideAnswer: (decisionIndex: number) =>
      requirePolicy(policyId).selectAnswer({ kind, seed: BigInt(seed), decisionIndex }),
  };
}

function policyAnswers(
  policyId: SimulationPolicyIdV1,
  seed: number,
): readonly JanuaryAnswerProviderV1[] {
  return createJanuary1990AnswerProviders({ policyId, seed, fixtureAnswers: {} });
}

const POLICIES: Readonly<Record<SimulationPolicyIdV1, JanuarySimulationPolicyV1>> = Object.freeze({
  "always-first-valid": Object.freeze({
    policyId: "always-first-valid",
    selectAnswer: (arguments_: JanuaryAnswerSelectionArgumentsV1) => firstAnswer(arguments_.kind),
  }),
  "learning-first": Object.freeze({
    policyId: "learning-first",
    selectAnswer: (arguments_: JanuaryAnswerSelectionArgumentsV1) => {
      if (arguments_.kind === "january-access") return answer("route", "home-pc");
      if (arguments_.kind === "january-learning") return answer("practice", "edit-and-debug");
      return answer("response", "inspect-listing");
    },
  }),
  "random-valid-v1": Object.freeze({
    policyId: "random-valid-v1",
    selectAnswer: (arguments_: JanuaryAnswerSelectionArgumentsV1) => {
      const random = Xoshiro256StarStar.fromSeed(
        arguments_.seed + BigInt(arguments_.decisionIndex) * 0x9e3779b9n,
      );
      if (arguments_.kind === "january-access") {
        return answer("route", pick(random, ACCESS_OPTIONS));
      }
      if (arguments_.kind === "january-learning") {
        return answer("practice", pick(random, LEARNING_OPTIONS));
      }
      return answer("response", pick(random, DEFECT_OPTIONS));
    },
  }),
});

const ACCESS_OPTIONS = ["home-pc", "shared-school-pc"] as const;
const LEARNING_OPTIONS = ["read-and-run", "edit-and-debug"] as const;
const DEFECT_OPTIONS = ["inspect-listing", "change-input", "ask-for-guidance"] as const;

function requirePolicy(policyId: SimulationPolicyIdV1): JanuarySimulationPolicyV1 {
  const policy = POLICIES[policyId];
  if (policy === undefined) {
    throw new TypeError(`Unknown simulation policy ${JSON.stringify(policyId)}`);
  }
  return policy;
}

function firstAnswer(kind: JanuaryAnswerSelectionV1["kind"]): AuthoritativeJsonValue {
  if (kind === "january-access") return answer("route", ACCESS_OPTIONS[0]);
  if (kind === "january-learning") return answer("practice", LEARNING_OPTIONS[0]);
  return answer("response", DEFECT_OPTIONS[0]);
}

function answer(field: "route" | "practice" | "response", value: string): AuthoritativeJsonValue {
  if (field === "route") return { schemaVersion: "january-access-answer-v1", route: value };
  if (field === "practice") return { schemaVersion: "january-learning-answer-v1", practice: value };
  return { schemaVersion: "january-defect-answer-v1", response: value };
}

function pick(random: Xoshiro256StarStar, options: readonly string[]): string {
  const index = random.nextInt(0, options.length);
  const value = options[index];
  if (value === undefined) throw new RangeError("Simulation policy pick failed");
  return value;
}

function januaryKind(kind: string): JanuaryAnswerSelectionV1["kind"] {
  if (kind === "january-access" || kind === "january-learning" || kind === "january-defect") {
    return kind;
  }
  throw new TypeError(`January simulation cannot answer decision kind ${JSON.stringify(kind)}`);
}

function buildMetrics(
  checkpoint: MonthRunCheckpointV1,
  decisions: number,
  terminalState: string,
): SimulationMetricSnapshotV1 {
  const scores = readQualityScores(terminalState === "completed" ? checkpoint : undefined);
  return Object.freeze({
    blockingDecisions: decisions,
    stateTransitions: checkpoint.programCounter + decisions,
    qualityScores: Object.freeze(scores),
    choices: collectChoices(checkpoint),
  });
}

function collectChoices(checkpoint: MonthRunCheckpointV1): SimulationChoiceDistributionV1 {
  const distribution = {
    accessRoute: {} as Record<string, number>,
    learningPractice: {} as Record<string, number>,
    defectResponse: {} as Record<string, number>,
  };
  for (const accepted of checkpoint.acceptedDecisions) {
    const answerRecord = accepted.answer as Readonly<Record<string, unknown>> | null;
    if (answerRecord === null || typeof answerRecord !== "object") continue;
    if (
      answerRecord.schemaVersion === "january-access-answer-v1" &&
      typeof answerRecord.route === "string"
    ) {
      bump(distribution.accessRoute, answerRecord.route);
    }
    if (
      answerRecord.schemaVersion === "january-learning-answer-v1" &&
      typeof answerRecord.practice === "string"
    ) {
      bump(distribution.learningPractice, answerRecord.practice);
    }
    if (
      answerRecord.schemaVersion === "january-defect-answer-v1" &&
      typeof answerRecord.response === "string"
    ) {
      bump(distribution.defectResponse, answerRecord.response);
    }
  }
  return Object.freeze({
    accessRoute: Object.freeze(distribution.accessRoute),
    learningPractice: Object.freeze(distribution.learningPractice),
    defectResponse: Object.freeze(distribution.defectResponse),
  });
}

function bump(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function readQualityScores(checkpoint: MonthRunCheckpointV1 | undefined): {
  clarity: number | null;
  correctness: number | null;
  reliability: number | null;
} {
  if (checkpoint === undefined) {
    return Object.freeze({ clarity: null, correctness: null, reliability: null });
  }
  const result = checkpoint.terminalResult as Readonly<Record<string, unknown>> | null;
  const outcome = result?.programmingOutcome as Readonly<Record<string, unknown>> | undefined;
  const scores = outcome?.qualityScores as Readonly<Record<string, unknown>> | undefined;
  return Object.freeze({
    clarity: readScore(scores?.clarity),
    correctness: readScore(scores?.correctness),
    reliability: readScore(scores?.reliability),
  });
}

function readScore(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function buildReport(
  input: Readonly<{
    request: SimulationRequestV1;
    runs: readonly JanuarySimulationTerminalRunV1[];
    rulesetFingerprint: Fingerprint;
    contentFingerprint: Fingerprint;
  }>,
): SimulationReportV1 {
  const invariantFailures: SimulationInvariantFailureV1[] = [];
  const aggregates: MutableSimulationAggregatesV1 = {
    completedRuns: 0,
    softLocks: 0,
    terminalFailures: 0,
    invalidStates: 0,
    monthsPlayed: 0,
    blockingDecisions: 0,
    stateTransitions: 0,
    scoreBounds: {
      clarity: { minimum: null, maximum: null },
      correctness: { minimum: null, maximum: null },
      reliability: { minimum: null, maximum: null },
    },
    choiceDistribution: {
      accessRoute: {},
      learningPractice: {},
      defectResponse: {},
    },
  };

  for (const run of input.runs) {
    switch (run.terminalState) {
      case "completed":
        aggregates.completedRuns += 1;
        aggregates.monthsPlayed += 1;
        break;
      case "soft-lock":
        aggregates.softLocks += 1;
        invariantFailures.push({
          invariant: "no-soft-lock",
          seed: run.seed,
          policyId: run.policyId,
          detail: `Run ended in status ${run.checkpoint.status}`,
        });
        break;
      case "protocol-rejected":
        aggregates.terminalFailures += 1;
        invariantFailures.push({
          invariant: "terminal-validity",
          seed: run.seed,
          policyId: run.policyId,
          detail: "Protocol rejected the policy answer",
        });
        break;
    }
    aggregates.blockingDecisions += run.metrics.blockingDecisions;
    aggregates.stateTransitions += run.metrics.stateTransitions;

    const scores = run.metrics.qualityScores;
    extendBound(aggregates.scoreBounds.clarity, scores.clarity);
    extendBound(aggregates.scoreBounds.correctness, scores.correctness);
    extendBound(aggregates.scoreBounds.reliability, scores.reliability);

    mergeChoices(aggregates.choiceDistribution.accessRoute, run.metrics.choices.accessRoute);
    mergeChoices(
      aggregates.choiceDistribution.learningPractice,
      run.metrics.choices.learningPractice,
    );
    mergeChoices(aggregates.choiceDistribution.defectResponse, run.metrics.choices.defectResponse);
  }

  return Object.freeze({
    schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION,
    rulesetFingerprint: input.rulesetFingerprint,
    contentFingerprint: input.contentFingerprint,
    policies: [...input.request.policies],
    seedRange: Object.freeze({
      start: input.request.seedStart,
      end: input.request.seedEnd,
    }),
    runs: input.runs.length,
    aggregates: freezeAggregates(aggregates),
    invariantFailures: Object.freeze(invariantFailures),
  });
}

type MutableSimulationAggregatesV1 = {
  completedRuns: number;
  softLocks: number;
  terminalFailures: number;
  invalidStates: number;
  monthsPlayed: number;
  blockingDecisions: number;
  stateTransitions: number;
  scoreBounds: {
    clarity: { minimum: number | null; maximum: number | null };
    correctness: { minimum: number | null; maximum: number | null };
    reliability: { minimum: number | null; maximum: number | null };
  };
  choiceDistribution: {
    accessRoute: Record<string, number>;
    learningPractice: Record<string, number>;
    defectResponse: Record<string, number>;
  };
};

function extendBound(
  bound: { minimum: number | null; maximum: number | null },
  value: number | null,
): void {
  if (value === null) return;
  bound.minimum = bound.minimum === null ? value : Math.min(bound.minimum, value);
  bound.maximum = bound.maximum === null ? value : Math.max(bound.maximum, value);
}

function mergeChoices(
  target: Record<string, number>,
  source: Readonly<Record<string, number>>,
): void {
  for (const [key, count] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + count;
  }
}

function freezeAggregates(aggregates: SimulationAggregatesV1): SimulationAggregatesV1 {
  return Object.freeze({
    ...aggregates,
    scoreBounds: Object.freeze({
      clarity: Object.freeze({ ...aggregates.scoreBounds.clarity }),
      correctness: Object.freeze({ ...aggregates.scoreBounds.correctness }),
      reliability: Object.freeze({ ...aggregates.scoreBounds.reliability }),
    }),
    choiceDistribution: Object.freeze({
      accessRoute: Object.freeze({ ...aggregates.choiceDistribution.accessRoute }),
      learningPractice: Object.freeze({ ...aggregates.choiceDistribution.learningPractice }),
      defectResponse: Object.freeze({ ...aggregates.choiceDistribution.defectResponse }),
    }),
  });
}

function requireSeedRange(start: number, end: number): void {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    end - start + 1 > 10_000
  ) {
    throw new RangeError("Simulation seed range must be bounded (at most 10000 seeds per run)");
  }
}

function requirePolicies(policies: readonly SimulationPolicyIdV1[]): void {
  if (policies.length === 0) {
    throw new TypeError("Simulation request requires at least one policy");
  }
  for (const policyId of policies) {
    if (!SIMULATION_POLICY_IDS.includes(policyId)) {
      throw new TypeError(`Unknown simulation policy ${JSON.stringify(policyId)}`);
    }
  }
}
