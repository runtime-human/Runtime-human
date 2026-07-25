import {
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  projectJanuary1990Content,
} from "@runtime-human/game-application";
import {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprint,
  createMonthRunCheckpoint,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_RNG_CALL_BUDGET,
  runUntilBoundary,
  transitionMonthRun,
  Xoshiro256StarStar,
  type January1990ContentContext,
  type MonthRunRunResult,
  type MonthRunStep,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type AuthoritativeJsonValue,
  type MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

import { loadJanuaryTestRegistry } from "./january-1990-runtime-fixture";

const ACCESS_ROUTES = ["home-pc", "shared-school-pc"] as const;
const LEARNING_PRACTICES = ["read-and-run", "edit-and-debug"] as const;
const DEFECT_RESPONSES = [
  "inspect-listing",
  "change-input",
  "ask-for-guidance",
] as const;

type AccessRoute = (typeof ACCESS_ROUTES)[number];
type LearningPractice = (typeof LEARNING_PRACTICES)[number];
type DefectResponse = (typeof DEFECT_RESPONSES)[number];

type QualityScores = Readonly<{
  clarity: number;
  correctness: number;
  reliability: number;
}>;

type QualityVector = QualityScores & Readonly<{ count: number }>;

export type January1990BalanceTrace = Readonly<{
  schemaVersion: "january-1990-balance-trace-v1";
  seedRange: Readonly<{ start: number; end: number; count: number }>;
  answerProfiles: number;
  totalRuns: number;
  decisionBoundariesPerRun: 3;
  transitionsPerRun: 12;
  fixedStepsPerRun: 9;
  materializedOutcomesPerRun: 4;
  rngCallBudget: Readonly<{ content: 0; narrative: 1; outcome: 1 }>;
  failures: 0;
  softLocks: 0;
  programmerActionShare: Readonly<{ programmerActions: 2; totalDecisions: 3 }>;
  choiceFrequencies: Readonly<{
    accessRoute: Readonly<{ "home-pc": number; "shared-school-pc": number }>;
    learningPractice: Readonly<{ "read-and-run": number; "edit-and-debug": number }>;
    defectResponse: Readonly<{
      "inspect-listing": number;
      "change-input": number;
      "ask-for-guidance": number;
    }>;
  }>;
  outcomeFrequencies: Readonly<{
    access: number;
    work: number;
    defect: number;
    programmingOutcome: number;
  }>;
  defectEvents: Readonly<{ logicError: number; syntaxError: number }>;
  responseQualityProfiles: readonly Readonly<{
    response: DefectResponse;
    runs: number;
    vectors: readonly QualityVector[];
  }>[];
}>;

export async function generateJanuary1990BalanceTrace(
  input: Readonly<{ seedStart: number; seedEnd: number }>,
): Promise<January1990BalanceTrace> {
  requireSeedRange(input.seedStart, input.seedEnd);
  const registry = await loadJanuaryTestRegistry();
  const context = projectJanuary1990Content(registry);
  const steps = createJanuary1990MonthSteps(context);
  if (steps.length !== 9) throw new Error(`January step table changed to ${steps.length} steps`);

  const vectorCounts = new Map<DefectResponse, Map<string, QualityVector>>(
    DEFECT_RESPONSES.map((response) => [response, new Map<string, QualityVector>()]),
  );
  let logicError = 0;
  let syntaxError = 0;

  for (let seed = input.seedStart; seed <= input.seedEnd; seed += 1) {
    for (const accessRoute of ACCESS_ROUTES) {
      for (const learningPractice of LEARNING_PRACTICES) {
        for (const defectResponse of DEFECT_RESPONSES) {
          const completed = runProfile(
            context,
            steps,
            seed,
            accessRoute,
            learningPractice,
            defectResponse,
          );
          const defectEventId = requireOutcomeString(
            completed,
            "january-1990/defect",
            "eventId",
          );
          if (defectEventId === JANUARY_1990_CONTENT_IDS.logicErrorEvent) logicError += 1;
          else if (defectEventId === JANUARY_1990_CONTENT_IDS.syntaxErrorEvent) syntaxError += 1;
          else throw new Error(`Unexpected January defect event ${defectEventId}`);

          const qualityScores = requireQualityScores(
            completed,
            "january-1990/programming-outcome",
          );
          addQualityVector(vectorCounts, defectResponse, qualityScores);
        }
      }
    }
  }

  const seedCount = input.seedEnd - input.seedStart + 1;
  const answerProfiles =
    ACCESS_ROUTES.length * LEARNING_PRACTICES.length * DEFECT_RESPONSES.length;
  const totalRuns = seedCount * answerProfiles;
  const accessChoiceRuns = seedCount * LEARNING_PRACTICES.length * DEFECT_RESPONSES.length;
  const learningChoiceRuns = seedCount * ACCESS_ROUTES.length * DEFECT_RESPONSES.length;
  const defectChoiceRuns = seedCount * ACCESS_ROUTES.length * LEARNING_PRACTICES.length;
  return Object.freeze({
    schemaVersion: "january-1990-balance-trace-v1",
    seedRange: Object.freeze({ start: input.seedStart, end: input.seedEnd, count: seedCount }),
    answerProfiles,
    totalRuns,
    decisionBoundariesPerRun: 3,
    transitionsPerRun: 12,
    fixedStepsPerRun: 9,
    materializedOutcomesPerRun: 4,
    rngCallBudget: Object.freeze({ ...JANUARY_1990_RNG_CALL_BUDGET }),
    failures: 0,
    softLocks: 0,
    programmerActionShare: Object.freeze({ programmerActions: 2, totalDecisions: 3 }),
    choiceFrequencies: Object.freeze({
      accessRoute: Object.freeze({
        "home-pc": accessChoiceRuns,
        "shared-school-pc": accessChoiceRuns,
      }),
      learningPractice: Object.freeze({
        "read-and-run": learningChoiceRuns,
        "edit-and-debug": learningChoiceRuns,
      }),
      defectResponse: Object.freeze({
        "inspect-listing": defectChoiceRuns,
        "change-input": defectChoiceRuns,
        "ask-for-guidance": defectChoiceRuns,
      }),
    }),
    outcomeFrequencies: Object.freeze({
      access: totalRuns,
      work: totalRuns,
      defect: totalRuns,
      programmingOutcome: totalRuns,
    }),
    defectEvents: Object.freeze({ logicError, syntaxError }),
    responseQualityProfiles: Object.freeze(
      DEFECT_RESPONSES.map((response) =>
        Object.freeze({
          response,
          runs: defectChoiceRuns,
          vectors: Object.freeze(
            [...requireVectorMap(vectorCounts, response).values()].toSorted(compareQualityVectors),
          ),
        }),
      ),
    ),
  });
}

function runProfile(
  context: January1990ContentContext,
  steps: readonly MonthRunStep[],
  seed: number,
  accessRoute: AccessRoute,
  learningPractice: LearningPractice,
  defectResponse: DefectResponse,
): MonthRunCheckpointV1 {
  const profileId = `${accessRoute}-${learningPractice}-${defectResponse}`;
  const initial = createMonthRunCheckpoint({
    runId: parseMonthRunId(`january-trace-${seed}-${profileId}`),
    saveId: parseSaveId("january-balance-trace-save"),
    baseSaveRevision: parseSaveRevision(0),
    plan: createJanuary1990MonthPlan(context),
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: createJanuary1990RulesFingerprint(),
      contentFingerprint: context.contentFingerprint,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      determinismManifest: DETERMINISM_MANIFEST_V1,
    },
    rngState: Xoshiro256StarStar.fromSeed(BigInt(seed)).exportState(),
  });
  const access = requireBoundary(runUntilBoundary(initial, steps), 2, "access");
  const learning = acceptAndRun(
    access,
    steps,
    `trace-${seed}-${profileId}-access`,
    JANUARY_1990_DECISION_IDS.access,
    { schemaVersion: "january-access-answer-v1", route: accessRoute },
    4,
    "learning",
  );
  const defect = acceptAndRun(
    learning,
    steps,
    `trace-${seed}-${profileId}-learning`,
    JANUARY_1990_DECISION_IDS.learning,
    { schemaVersion: "january-learning-answer-v1", practice: learningPractice },
    7,
    "defect",
  );
  const completed = acceptAndRun(
    defect,
    steps,
    `trace-${seed}-${profileId}-defect`,
    JANUARY_1990_DECISION_IDS.defect,
    { schemaVersion: "january-defect-answer-v1", response: defectResponse },
    9,
    "completion",
  );
  if (completed.status !== "completed") {
    throw new Error(`January trace ${seed}/${profileId} ended as ${completed.status}`);
  }
  return completed;
}

function acceptAndRun(
  checkpoint: MonthRunCheckpointV1,
  steps: readonly MonthRunStep[],
  requestId: string,
  decisionId: string,
  answer: AuthoritativeJsonValue,
  programCounter: number,
  label: string,
): MonthRunCheckpointV1 {
  const accepted = transitionMonthRun(checkpoint, {
    type: "accept-decision",
    requestId: parseRequestId(requestId),
    decisionId: parseDecisionId(decisionId),
    answer,
  });
  if (accepted.kind !== "accepted") {
    throw new Error(`January trace ${label} decision was ${accepted.kind}`);
  }
  return requireBoundary(runUntilBoundary(accepted.checkpoint, steps), programCounter, label);
}

function requireBoundary(
  result: MonthRunRunResult,
  programCounter: number,
  label: string,
): MonthRunCheckpointV1 {
  if (result.kind !== "boundary") {
    throw new Error(`January trace did not reach ${label} boundary: ${result.kind}`);
  }
  if (result.checkpoint.programCounter !== programCounter) {
    throw new Error(
      `January trace ${label} boundary moved to PC ${result.checkpoint.programCounter}`,
    );
  }
  return result.checkpoint;
}

function requireOutcomeString(
  checkpoint: MonthRunCheckpointV1,
  outcomeId: string,
  field: string,
): string {
  const value = requireOutcomeRecord(checkpoint, outcomeId)[field];
  if (typeof value !== "string") throw new TypeError(`${outcomeId}.${field} must be a string`);
  return value;
}

function requireQualityScores(
  checkpoint: MonthRunCheckpointV1,
  outcomeId: string,
): QualityScores {
  const value = requireOutcomeRecord(checkpoint, outcomeId).qualityScores;
  if (!isRecord(value)) throw new TypeError(`${outcomeId}.qualityScores must be an object`);
  return Object.freeze({
    clarity: requireSafeInteger(value.clarity, "clarity"),
    correctness: requireSafeInteger(value.correctness, "correctness"),
    reliability: requireSafeInteger(value.reliability, "reliability"),
  });
}

function requireOutcomeRecord(
  checkpoint: MonthRunCheckpointV1,
  outcomeId: string,
): Readonly<Record<string, unknown>> {
  const outcome = checkpoint.materializedOutcomes.find(
    (candidate) => candidate.outcomeId === outcomeId,
  );
  if (!isRecord(outcome?.payload)) throw new TypeError(`Outcome ${outcomeId} is missing`);
  return outcome.payload;
}

function addQualityVector(
  vectorCounts: Map<DefectResponse, Map<string, QualityVector>>,
  response: DefectResponse,
  scores: QualityScores,
): void {
  const map = requireVectorMap(vectorCounts, response);
  const key = `${scores.clarity}/${scores.correctness}/${scores.reliability}`;
  const current = map.get(key);
  map.set(
    key,
    Object.freeze({
      ...scores,
      count: (current?.count ?? 0) + 1,
    }),
  );
}

function requireVectorMap(
  vectorCounts: Map<DefectResponse, Map<string, QualityVector>>,
  response: DefectResponse,
): Map<string, QualityVector> {
  const map = vectorCounts.get(response);
  if (map === undefined) throw new Error(`Missing trace accumulator for ${response}`);
  return map;
}

function compareQualityVectors(left: QualityVector, right: QualityVector): number {
  return (
    left.clarity - right.clarity ||
    left.correctness - right.correctness ||
    left.reliability - right.reliability
  );
}

function requireSafeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`January quality ${field} must be a safe integer`);
  }
  return value;
}

function requireSeedRange(start: number, end: number): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw new RangeError("January balance trace seed range is invalid");
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
