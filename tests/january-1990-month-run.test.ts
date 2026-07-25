import { describe, expect, it } from "vitest";

import * as gameCore from "@runtime-human/game-core";
import type { January1990ContentContext } from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type Fingerprint,
  type MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

type JanuaryRuntimeApi = Readonly<{
  JANUARY_1990_DECISION_IDS?: Readonly<{
    access: string;
    learning: string;
    defect: string;
  }>;
  JANUARY_1990_RNG_SCOPES?: Readonly<{
    content: "month/content";
    narrative: "month/narrative";
    outcome: "month/outcome";
  }>;
  createJanuary1990MonthPlan?: (context: January1990ContentContext) => unknown;
  createJanuary1990MonthSteps?: (
    context: January1990ContentContext,
  ) => readonly gameCore.MonthRunStep[];
  createJanuary1990RulesFingerprint?: () => Fingerprint;
}>;

const api = gameCore as typeof gameCore & JanuaryRuntimeApi;
const C = gameCore.JANUARY_1990_CONTENT_IDS;
const R = gameCore.JANUARY_1990_REASON_CODES;
const contentFingerprint = gameCore.fingerprint("january-1990-month-run-test", {
  fixture: "content",
});

function requireFunction<T extends (...args: never[]) => unknown>(
  value: T | undefined,
  name: string,
): T {
  expect(value, `${name} must be exported from game-core`).toBeTypeOf("function");
  return value as T;
}

function createContext(): January1990ContentContext {
  return Object.freeze({
    schemaVersion: "january-1990-content-context-v1",
    month: "1990-01",
    contentFingerprint,
    requiredChunkIds: gameCore.JANUARY_1990_REQUIRED_CHUNK_IDS,
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
  const createPlan = requireFunction(api.createJanuary1990MonthPlan, "createJanuary1990MonthPlan");
  const createRulesFingerprint = requireFunction(
    api.createJanuary1990RulesFingerprint,
    "createJanuary1990RulesFingerprint",
  );
  return gameCore.createMonthRunCheckpoint({
    runId: parseMonthRunId(`january-run-${seed}`),
    saveId: parseSaveId("january-save"),
    baseSaveRevision: parseSaveRevision(0),
    plan: createPlan(createContext()) as never,
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: createRulesFingerprint(),
      contentFingerprint,
      saveSchemaFingerprint: gameCore.fingerprint("january-save-schema-test", { version: 1 }),
      determinismManifest: DETERMINISM_MANIFEST_V1,
    },
    rngState: gameCore.Xoshiro256StarStar.fromSeed(seed).exportState(),
  });
}

function acceptAndRun(
  checkpoint: MonthRunCheckpointV1,
  steps: readonly gameCore.MonthRunStep[],
  requestId: string,
  decisionId: string,
  answer: Record<string, string>,
): MonthRunCheckpointV1 {
  const accepted = gameCore.transitionMonthRun(checkpoint, {
    type: "accept-decision",
    requestId: parseRequestId(requestId),
    decisionId: parseDecisionId(decisionId),
    answer,
  });
  expect(accepted.kind).toBe("accepted");
  if (accepted.kind !== "accepted") throw new Error("Decision acceptance failed");
  const run = gameCore.runUntilBoundary(accepted.checkpoint, steps);
  expect(run.kind).toBe("boundary");
  if (run.kind !== "boundary") throw new Error("January MonthRun did not reach a boundary");
  return run.checkpoint;
}

function runCompleted(seed: bigint): MonthRunCheckpointV1 {
  const createSteps = requireFunction(
    api.createJanuary1990MonthSteps,
    "createJanuary1990MonthSteps",
  );
  const decisionIds = api.JANUARY_1990_DECISION_IDS;
  expect(decisionIds).toBeDefined();
  if (decisionIds === undefined) throw new Error("January decision IDs are missing");
  const steps = createSteps(createContext());
  expect(steps).toHaveLength(9);

  const first = gameCore.runUntilBoundary(createInitialCheckpoint(seed), steps);
  expect(first.kind).toBe("boundary");
  if (first.kind !== "boundary") throw new Error("January MonthRun did not start");
  expect(first.checkpoint.status).toBe("suspended");
  expect(first.checkpoint.programCounter).toBe(2);
  expect(first.checkpoint.pendingDecision?.decisionId).toBe(decisionIds.access);

  const learning = acceptAndRun(first.checkpoint, steps, "request-access", decisionIds.access, {
    schemaVersion: "january-access-answer-v1",
    route: "home-pc",
  });
  expect(learning.status).toBe("suspended");
  expect(learning.programCounter).toBe(4);
  expect(learning.pendingDecision?.decisionId).toBe(decisionIds.learning);

  const defect = acceptAndRun(learning, steps, "request-learning", decisionIds.learning, {
    schemaVersion: "january-learning-answer-v1",
    practice: "edit-and-debug",
  });
  expect(defect.status).toBe("suspended");
  expect(defect.programCounter).toBe(7);
  expect(defect.pendingDecision?.decisionId).toBe(decisionIds.defect);

  const completed = acceptAndRun(defect, steps, "request-defect", decisionIds.defect, {
    schemaVersion: "january-defect-answer-v1",
    response: "inspect-listing",
  });
  expect(completed.status).toBe("completed");
  expect(completed.programCounter).toBe(9);
  return completed;
}

describe("January 1990 deterministic MonthRun", () => {
  it("publishes the exact closed RNG scopes", () => {
    expect(api.JANUARY_1990_RNG_SCOPES).toEqual({
      content: "month/content",
      narrative: "month/narrative",
      outcome: "month/outcome",
    });
    expect(Object.isFrozen(api.JANUARY_1990_RNG_SCOPES)).toBe(true);
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

  it("keeps the rules fingerprint stable and separate from content", () => {
    const createRulesFingerprint = requireFunction(
      api.createJanuary1990RulesFingerprint,
      "createJanuary1990RulesFingerprint",
    );

    const first = createRulesFingerprint();
    const second = createRulesFingerprint();

    expect(first).toBe(second);
    expect(first).not.toBe(contentFingerprint);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });
});
