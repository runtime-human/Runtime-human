import { describe, expect, it } from "vitest";

import {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprint,
  createMonthRunCheckpoint,
  fingerprint,
  JANUARY_1990_CONTENT_IDS as C,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_REASON_CODES as R,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  JANUARY_1990_RNG_CALL_BUDGET,
  JANUARY_1990_RNG_SCOPES,
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
  type MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

type DefectResponse = "inspect-listing" | "change-input" | "ask-for-guidance";

const contentFingerprint = fingerprint("january-1990-month-run-test", {
  fixture: "content",
});

function createContext(): January1990ContentContext {
  return Object.freeze({
    schemaVersion: "january-1990-content-context-v1",
    month: "1990-01",
    contentFingerprint,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
    technology: {
      familyId: C.basicTechnologyFamily,
      family: "basic",
      technologyId: C.gwBasicTechnology,
      technology: "gw-basic",
      bandId: C.gwBasicDos1990Band,
      tier: "A",
      platformId: C.dosPcPlatform,
      platform: "dos-pc",
      toolchainId: C.gwBasicInterpreterToolchain,
      toolchain: "gw-basic-interpreter",
      ecosystemProfileId: C.offlineManualsEcosystem,
      documentationMode: "offline",
    },
    accessRoutes: [
      {
        id: C.homePcAccess,
        route: "home-pc",
        constraint: "household-availability",
        reasonCode: R.homePcAccess,
      },
      {
        id: C.sharedSchoolPcAccess,
        route: "shared-school-pc",
        constraint: "limited-schedule",
        reasonCode: R.sharedSchoolPcAccess,
      },
    ],
    skills: [
      { id: C.debuggingSkill, skill: "debugging", quality: "correctness" },
      {
        id: C.problemDecompositionSkill,
        skill: "problem-decomposition",
        quality: "clarity",
      },
      { id: C.programReadingSkill, skill: "program-reading", quality: "clarity" },
      {
        id: C.programWritingSkill,
        skill: "program-writing",
        quality: "correctness",
      },
      { id: C.toolUseSkill, skill: "tool-use", quality: "reliability" },
    ],
    learningActivities: [
      {
        id: C.firstListingActivity,
        activity: "first-listing",
        practiceMode: "read-and-run",
        skillIds: [
          C.problemDecompositionSkill,
          C.programReadingSkill,
          C.programWritingSkill,
          C.toolUseSkill,
        ],
        reasonCode: R.readAndRunLearning,
      },
      {
        id: C.modifyListingActivity,
        activity: "modify-listing",
        practiceMode: "edit-and-debug",
        skillIds: [C.debuggingSkill],
        reasonCode: R.editAndDebugLearning,
      },
    ],
    project: {
      id: C.personalUtilityProject,
      archetype: "personal-utility",
      qualities: ["clarity", "correctness", "reliability"],
      workPackages: [
        {
          id: C.inputOutputWorkPackage,
          goal: "input-output",
          quality: "correctness",
          skillIds: [C.problemDecompositionSkill, C.programWritingSkill, C.toolUseSkill],
          reasonCode: R.inputOutputProject,
        },
        {
          id: C.validationFixWorkPackage,
          goal: "validation-fix",
          quality: "reliability",
          skillIds: [C.debuggingSkill],
          reasonCode: R.validationFixProject,
        },
      ],
    },
    situation: {
      id: C.firstBugSituation,
      issueType: "first-bug",
      eventIds: [C.logicErrorEvent, C.syntaxErrorEvent],
    },
    events: [
      {
        id: C.accessWindowEvent,
        eventType: "access-window",
        reasonCode: R.accessWindowEvent,
      },
      {
        id: C.logicErrorEvent,
        eventType: "logic-error",
        reasonCode: R.logicErrorSituation,
      },
      {
        id: C.manualFoundEvent,
        eventType: "manual-found",
        reasonCode: R.manualFoundEvent,
      },
      {
        id: C.programRunsEvent,
        eventType: "program-runs",
        reasonCode: R.programRunsOutcome,
      },
      {
        id: C.syntaxErrorEvent,
        eventType: "syntax-error",
        reasonCode: R.syntaxErrorSituation,
      },
    ],
  });
}

function createInitialCheckpoint(seed: bigint): MonthRunCheckpointV1 {
  return createMonthRunCheckpoint({
    runId: parseMonthRunId(`january-run-${seed}`),
    saveId: parseSaveId("january-save"),
    baseSaveRevision: parseSaveRevision(0),
    plan: createJanuary1990MonthPlan(createContext()),
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: createJanuary1990RulesFingerprint(),
      contentFingerprint,
      saveSchemaFingerprint: fingerprint("january-save-schema-test", { version: 1 }),
      determinismManifest: DETERMINISM_MANIFEST_V1,
    },
    rngState: Xoshiro256StarStar.fromSeed(seed).exportState(),
  });
}

function createSteps(): readonly MonthRunStep[] {
  const steps = createJanuary1990MonthSteps(createContext());
  expect(steps).toHaveLength(9);
  return steps;
}

function requireBoundary(result: MonthRunRunResult, message: string): MonthRunCheckpointV1 {
  expect(result.kind).toBe("boundary");
  if (result.kind !== "boundary") throw new Error(message);
  return result.checkpoint;
}

function acceptDecision(
  checkpoint: MonthRunCheckpointV1,
  requestId: string,
  decisionId: string,
  answer: Record<string, string>,
): MonthRunCheckpointV1 {
  const accepted = transitionMonthRun(checkpoint, {
    type: "accept-decision",
    requestId: parseRequestId(requestId),
    decisionId: parseDecisionId(decisionId),
    answer,
  });
  expect(accepted.kind).toBe("accepted");
  if (accepted.kind !== "accepted") throw new Error("Decision acceptance failed");
  return accepted.checkpoint;
}

function acceptAndRun(
  checkpoint: MonthRunCheckpointV1,
  steps: readonly MonthRunStep[],
  requestId: string,
  decisionId: string,
  answer: Record<string, string>,
): MonthRunCheckpointV1 {
  return requireBoundary(
    runUntilBoundary(acceptDecision(checkpoint, requestId, decisionId, answer), steps),
    "January MonthRun did not reach a boundary",
  );
}

function runCompleted(
  seed: bigint,
  response: DefectResponse = "inspect-listing",
): MonthRunCheckpointV1 {
  const steps = createSteps();

  const first = requireBoundary(
    runUntilBoundary(createInitialCheckpoint(seed), steps),
    "January MonthRun did not start",
  );
  expect(first.status).toBe("suspended");
  expect(first.programCounter).toBe(2);
  expect(first.pendingDecision?.decisionId).toBe(JANUARY_1990_DECISION_IDS.access);

  const learning = acceptAndRun(first, steps, "request-access", JANUARY_1990_DECISION_IDS.access, {
    schemaVersion: "january-access-answer-v1",
    route: "home-pc",
  });
  expect(learning.status).toBe("suspended");
  expect(learning.programCounter).toBe(4);
  expect(learning.pendingDecision?.decisionId).toBe(JANUARY_1990_DECISION_IDS.learning);

  const defect = acceptAndRun(
    learning,
    steps,
    "request-learning",
    JANUARY_1990_DECISION_IDS.learning,
    {
      schemaVersion: "january-learning-answer-v1",
      practice: "edit-and-debug",
    },
  );
  expect(defect.status).toBe("suspended");
  expect(defect.programCounter).toBe(7);
  expect(defect.pendingDecision?.decisionId).toBe(JANUARY_1990_DECISION_IDS.defect);

  const completed = acceptAndRun(
    defect,
    steps,
    "request-defect",
    JANUARY_1990_DECISION_IDS.defect,
    {
      schemaVersion: "january-defect-answer-v1",
      response,
    },
  );
  expect(completed.status).toBe("completed");
  expect(completed.programCounter).toBe(9);
  return completed;
}

function readOutcomeField(
  checkpoint: MonthRunCheckpointV1,
  outcomeId: string,
  field: string,
): unknown {
  const outcome = checkpoint.materializedOutcomes.find(
    (candidate) => candidate.outcomeId === outcomeId,
  );
  if (
    outcome === undefined ||
    typeof outcome.payload !== "object" ||
    outcome.payload === null ||
    Array.isArray(outcome.payload)
  ) {
    throw new Error(`Outcome ${outcomeId} is missing or malformed`);
  }
  return (outcome.payload as Readonly<Record<string, unknown>>)[field];
}

describe("January 1990 deterministic MonthRun", () => {
  it("publishes the exact closed RNG scopes and call budget", () => {
    expect(JANUARY_1990_RNG_SCOPES).toEqual({
      content: "month/content",
      narrative: "month/narrative",
      outcome: "month/outcome",
    });
    expect(JANUARY_1990_RNG_CALL_BUDGET).toEqual({
      content: 0,
      narrative: 1,
      outcome: 1,
    });
    expect(Object.isFrozen(JANUARY_1990_RNG_SCOPES)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_RNG_CALL_BUDGET)).toBe(true);
  });

  it("reaches three decisions and one programming result in nine fixed steps", () => {
    const completed = runCompleted(42n);

    expect(completed.acceptedDecisions).toHaveLength(3);
    expect(completed.materializedOutcomes).toHaveLength(4);
    expect(completed.materializedOutcomes.map((outcome) => outcome.outcomeId)).toEqual([
      "january-1990/access",
      "january-1990/work",
      "january-1990/defect",
      "january-1990/programming-outcome",
    ]);
    expect(completed.terminalResult).toEqual(
      expect.objectContaining({
        schemaVersion: "january-1990-result-v1",
        month: "1990-01",
        projectId: C.personalUtilityProject,
        outcomeEventId: C.programRunsEvent,
      }),
    );
  });

  it("reproduces the exact final checkpoint for one seed and answer sequence", () => {
    const first = runCompleted(42n);
    const second = runCompleted(42n);

    expect(second.checkpointHash).toBe(first.checkpointHash);
    expect(second.rngState).toBe(first.rngState);
    expect(second.materializedOutcomes).toEqual(first.materializedOutcomes);
    expect(second.terminalResult).toEqual(first.terminalResult);
  });

  it("replays an identical pre-defect checkpoint without extra RNG work", () => {
    const steps = createSteps();
    const accessBoundary = requireBoundary(
      runUntilBoundary(createInitialCheckpoint(19n), steps),
      "January access boundary was not reached",
    );
    const learningBoundary = acceptAndRun(
      accessBoundary,
      steps,
      "replay-access",
      JANUARY_1990_DECISION_IDS.access,
      { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    );
    const acceptedLearning = acceptDecision(
      learningBoundary,
      "replay-learning",
      JANUARY_1990_DECISION_IDS.learning,
      { schemaVersion: "january-learning-answer-v1", practice: "edit-and-debug" },
    );

    const first = requireBoundary(
      runUntilBoundary(acceptedLearning, steps),
      "First replay did not reach the defect boundary",
    );
    const second = requireBoundary(
      runUntilBoundary(acceptedLearning, steps),
      "Second replay did not reach the defect boundary",
    );

    expect(second.checkpointHash).toBe(first.checkpointHash);
    expect(second.rngState).toBe(first.rngState);
    expect(second.materializedOutcomes).toEqual(first.materializedOutcomes);
    expect(second.pendingDecision).toEqual(first.pendingDecision);
  });

  it("covers both bounded syntax and logic defect branches", () => {
    const defectIds = new Set(
      Array.from({ length: 32 }, (_, index) =>
        readOutcomeField(runCompleted(BigInt(index + 1)), "january-1990/defect", "eventId"),
      ),
    );

    expect([...defectIds].toSorted()).toEqual([C.logicErrorEvent, C.syntaxErrorEvent].toSorted());
  });

  it("produces visible trade-offs for the three defect responses", () => {
    const inspect = readOutcomeField(
      runCompleted(42n, "inspect-listing"),
      "january-1990/programming-outcome",
      "qualityScores",
    );
    const changeInput = readOutcomeField(
      runCompleted(42n, "change-input"),
      "january-1990/programming-outcome",
      "qualityScores",
    );
    const guidance = readOutcomeField(
      runCompleted(42n, "ask-for-guidance"),
      "january-1990/programming-outcome",
      "qualityScores",
    );

    expect(changeInput).not.toEqual(inspect);
    expect(guidance).not.toEqual(inspect);
    expect(guidance).not.toEqual(changeInput);
  });

  it("rejects a MonthPlan that does not match January compatibility", () => {
    const checkpoint = createInitialCheckpoint(7n);
    const incompatible = {
      ...checkpoint,
      plan: {
        schemaVersion: "january-1990-month-plan-v1",
        month: "1990-01",
        program: "another-program",
        contentFingerprint,
        requiredChunkIds: ["1990s/ecosystem", "1990s/programming"],
      },
    } as unknown as MonthRunCheckpointV1;

    const result = runUntilBoundary(incompatible, createSteps());

    expect(result.kind).toBe("rejected");
    if (result.kind !== "rejected") throw new Error("Incompatible MonthPlan was accepted");
    expect(result.error.code).toBe("InvalidCommand");
    expect(result.checkpoint).toBe(incompatible);
  });

  it("keeps the rules fingerprint stable and separate from content", () => {
    const first = createJanuary1990RulesFingerprint();
    const second = createJanuary1990RulesFingerprint();

    expect(first).toBe(second);
    expect(first).not.toBe(contentFingerprint);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });
});
