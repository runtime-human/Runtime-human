import type {
  AuthoritativeJsonValue,
  DecisionId,
  Fingerprint,
  MonthRunCheckpointV1,
  MonthRunEventV1,
  PendingDecisionV1,
} from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import { Xoshiro256StarStar } from "../determinism/xoshiro256ss";
import { snapshotAuthoritativeValue } from "../month-run/checkpoint";
import type { MonthRunStep } from "../month-run/runner";
import {
  parseJanuaryAccessAnswer,
  parseJanuaryDefectAnswer,
  parseJanuaryLearningAnswer,
} from "./january-answers";
import type { January1990ContentContext, JanuaryEventDefinition } from "./january-content-context";
import type { January1990ContentId } from "./january-content-ids";
import { JANUARY_1990_CONTENT_IDS } from "./january-content-ids";
import { JANUARY_1990_DECISION_IDS } from "./january-decisions";
import {
  createJanuary1990Result,
  createJanuaryProgrammingOutcomeFromState,
  materializeJanuaryProgrammingState,
} from "./january-outcome";
import {
  parseJanuaryProvisionalState,
  updateJanuaryProvisionalState,
} from "./january-provisional-state";
import { JANUARY_1990_RNG_SCOPES } from "./january-rng-scopes";

const ANSWER_SCHEMA_FINGERPRINTS = Object.freeze({
  access: fingerprint("january-1990-answer-schema-v1", {
    schemaVersion: "january-access-answer-v1",
    route: ["home-pc", "shared-school-pc"],
  }),
  learning: fingerprint("january-1990-answer-schema-v1", {
    schemaVersion: "january-learning-answer-v1",
    practice: ["edit-and-debug", "read-and-run"],
  }),
  defect: fingerprint("january-1990-answer-schema-v1", {
    schemaVersion: "january-defect-answer-v1",
    response: ["ask-for-guidance", "change-input", "inspect-listing"],
  }),
});

export function createJanuary1990MonthSteps(
  context: January1990ContentContext,
): readonly MonthRunStep[] {
  requireJanuaryContext(context);
  return Object.freeze([
    () => ({ type: "start" }),
    () => suspendForAccess(context),
    (checkpoint) => materializeAccess(context, checkpoint),
    () => suspendForLearning(context),
    (checkpoint) => materializeWork(context, checkpoint),
    (checkpoint) => materializeDefect(context, checkpoint),
    (checkpoint) => suspendForDefect(context, checkpoint),
    (checkpoint) => materializeProgrammingOutcome(context, checkpoint),
    (checkpoint) => completeJanuary(context, checkpoint),
  ] satisfies readonly MonthRunStep[]);
}

function suspendForAccess(context: January1990ContentContext): MonthRunEventV1 {
  return {
    type: "suspend-for-decision",
    decision: createDecision(
      JANUARY_1990_DECISION_IDS.access,
      "january-access",
      {
        schemaVersion: "january-access-prompt-v1",
        routes: context.accessRoutes.map((route) => ({
          id: route.id,
          route: route.route,
          constraint: route.constraint,
          reasonCode: route.reasonCode,
        })),
      },
      ANSWER_SCHEMA_FINGERPRINTS.access,
    ),
  };
}

function materializeAccess(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): MonthRunEventV1 {
  const answer = parseJanuaryAccessAnswer(
    JANUARY_1990_DECISION_IDS.access,
    requireAcceptedAnswer(checkpoint, JANUARY_1990_DECISION_IDS.access),
  );
  const route = context.accessRoutes.find((candidate) => candidate.route === answer.route);
  if (route === undefined) throw new TypeError("Accepted January access route is absent from context");
  const nextState = updateJanuaryProvisionalState(
    parseJanuaryProvisionalState(checkpoint.provisionalState),
    { accessRoute: answer.route },
  );

  return materializedEvent({
    checkpoint,
    outcomeId: "january-1990/access",
    scope: JANUARY_1990_RNG_SCOPES.content,
    phase: "materialize",
    state: nextState,
    payload: {
      schemaVersion: "january-1990-access-outcome-v1",
      routeId: route.id,
      route: route.route,
      constraint: route.constraint,
      reasonCode: route.reasonCode,
    },
  });
}

function suspendForLearning(context: January1990ContentContext): MonthRunEventV1 {
  return {
    type: "suspend-for-decision",
    decision: createDecision(
      JANUARY_1990_DECISION_IDS.learning,
      "january-learning",
      {
        schemaVersion: "january-learning-prompt-v1",
        activities: context.learningActivities.map((activity) => ({
          id: activity.id,
          practice: activity.practiceMode,
          reasonCode: activity.reasonCode,
        })),
      },
      ANSWER_SCHEMA_FINGERPRINTS.learning,
    ),
  };
}

function materializeWork(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): MonthRunEventV1 {
  const answer = parseJanuaryLearningAnswer(
    JANUARY_1990_DECISION_IDS.learning,
    requireAcceptedAnswer(checkpoint, JANUARY_1990_DECISION_IDS.learning),
  );
  const activity = context.learningActivities.find(
    (candidate) => candidate.practiceMode === answer.practice,
  );
  const workPackage = context.project.workPackages.find(
    (candidate) => candidate.id === JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
  );
  if (activity === undefined || workPackage === undefined) {
    throw new TypeError("January learning activity or input/output work package is missing");
  }
  const nextState = updateJanuaryProvisionalState(
    parseJanuaryProvisionalState(checkpoint.provisionalState),
    {
      learningPractice: answer.practice,
      workPackageId: workPackage.id,
    },
  );

  return materializedEvent({
    checkpoint,
    outcomeId: "january-1990/work",
    scope: JANUARY_1990_RNG_SCOPES.content,
    phase: "materialize",
    state: nextState,
    payload: {
      schemaVersion: "january-1990-work-outcome-v1",
      activityId: activity.id,
      practice: activity.practiceMode,
      workPackageId: workPackage.id,
      goal: workPackage.goal,
      quality: workPackage.quality,
      reasonCode: workPackage.reasonCode,
    },
  });
}

function materializeDefect(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): MonthRunEventV1 {
  const state = parseJanuaryProvisionalState(checkpoint.provisionalState);
  if (state.workPackageId !== JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage) {
    throw new TypeError("January work must be materialized before defect selection");
  }
  const candidates = [...context.situation.eventIds].toSorted(compareText);
  if (candidates.length !== 2) {
    throw new TypeError("January first-bug situation must expose exactly two defect events");
  }
  const random = Xoshiro256StarStar.fromState(checkpoint.rngState).fork(
    JANUARY_1990_RNG_SCOPES.narrative,
  );
  const defectEventId = candidates[random.nextInt(0, candidates.length)];
  if (defectEventId === undefined) throw new TypeError("January defect selection failed");
  const defect = requireEvent(context, defectEventId);
  const nextState = updateJanuaryProvisionalState(state, { defectEventId });

  return materializedEvent({
    checkpoint,
    outcomeId: "january-1990/defect",
    scope: JANUARY_1990_RNG_SCOPES.narrative,
    phase: "resolve",
    state: nextState,
    rngState: random.exportState(),
    payload: {
      schemaVersion: "january-1990-defect-outcome-v1",
      situationId: context.situation.id,
      eventId: defect.id,
      eventType: defect.eventType,
      reasonCode: defect.reasonCode,
    },
  });
}

function suspendForDefect(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): MonthRunEventV1 {
  const state = parseJanuaryProvisionalState(checkpoint.provisionalState);
  const defectEventId = requireValue(state.defectEventId, "defect event");
  const defect = requireEvent(context, defectEventId);
  return {
    type: "suspend-for-decision",
    decision: createDecision(
      JANUARY_1990_DECISION_IDS.defect,
      "january-defect",
      {
        schemaVersion: "january-defect-prompt-v1",
        eventId: defect.id,
        eventType: defect.eventType,
        responses: ["ask-for-guidance", "change-input", "inspect-listing"],
      },
      ANSWER_SCHEMA_FINGERPRINTS.defect,
    ),
  };
}

function materializeProgrammingOutcome(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): MonthRunEventV1 {
  const answer = parseJanuaryDefectAnswer(
    JANUARY_1990_DECISION_IDS.defect,
    requireAcceptedAnswer(checkpoint, JANUARY_1990_DECISION_IDS.defect),
  );
  const stateWithAnswer = updateJanuaryProvisionalState(
    parseJanuaryProvisionalState(checkpoint.provisionalState),
    { defectResponse: answer.response },
  );
  const random = Xoshiro256StarStar.fromState(checkpoint.rngState).fork(
    JANUARY_1990_RNG_SCOPES.outcome,
  );
  const materialized = materializeJanuaryProgrammingState(
    stateWithAnswer,
    random.nextInt(0, 3),
  );
  const finalState = updateJanuaryProvisionalState(stateWithAnswer, materialized);
  const programmingOutcome = createJanuaryProgrammingOutcomeFromState(context, finalState);

  return materializedEvent({
    checkpoint,
    outcomeId: "january-1990/programming-outcome",
    scope: JANUARY_1990_RNG_SCOPES.outcome,
    phase: "resolve",
    state: finalState,
    rngState: random.exportState(),
    payload: programmingOutcome,
  });
}

function completeJanuary(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): MonthRunEventV1 {
  const state = parseJanuaryProvisionalState(checkpoint.provisionalState);
  const programmingOutcome = createJanuaryProgrammingOutcomeFromState(context, state);
  return {
    type: "complete",
    result: snapshotAuthoritativeValue(createJanuary1990Result(programmingOutcome)),
  };
}

function createDecision(
  decisionId: DecisionId,
  kind: string,
  prompt: unknown,
  answerSchemaFingerprint: Fingerprint,
): PendingDecisionV1 {
  return Object.freeze({
    decisionId,
    kind,
    prompt: snapshotAuthoritativeValue(prompt),
    answerSchemaFingerprint,
  });
}

function materializedEvent(input: Readonly<{
  checkpoint: MonthRunCheckpointV1;
  outcomeId: string;
  scope: string;
  phase: "materialize" | "resolve";
  state: unknown;
  payload: unknown;
  rngState?: MonthRunCheckpointV1["rngState"];
}>): MonthRunEventV1 {
  return {
    type: "materialize-outcome",
    outcomeId: input.outcomeId,
    scope: input.scope,
    phase: input.phase,
    provisionalState: snapshotAuthoritativeValue(input.state),
    payload: snapshotAuthoritativeValue(input.payload),
    rngState: input.rngState ?? input.checkpoint.rngState,
  };
}

function requireAcceptedAnswer(
  checkpoint: MonthRunCheckpointV1,
  decisionId: DecisionId,
): AuthoritativeJsonValue {
  const accepted = checkpoint.acceptedDecisions.find(
    (candidate) => candidate.decisionId === decisionId,
  );
  if (accepted === undefined) {
    throw new TypeError(`January decision ${decisionId} has not been answered`);
  }
  return accepted.answer;
}

function requireEvent(
  context: January1990ContentContext,
  eventId: January1990ContentId,
): JanuaryEventDefinition {
  const event = context.events.find((candidate) => candidate.id === eventId);
  if (event === undefined) throw new TypeError(`January event ${eventId} is missing from context`);
  return event;
}

function requireValue<T>(value: T | null, label: string): T {
  if (value === null) throw new TypeError(`January ${label} is missing`);
  return value;
}

function requireJanuaryContext(context: January1990ContentContext): void {
  if (
    context.schemaVersion !== "january-1990-content-context-v1" ||
    context.month !== "1990-01" ||
    context.requiredChunkIds[0] !== "1990s/ecosystem" ||
    context.requiredChunkIds[1] !== "1990s/programming"
  ) {
    throw new TypeError("January MonthRun requires the verified January 1990 content context");
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
