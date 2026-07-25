import { parseDecisionId, type DecisionId } from "@runtime-human/game-schema";

export const JANUARY_1990_DECISION_IDS = Object.freeze({
  access: parseDecisionId("january-1990/access"),
  learning: parseDecisionId("january-1990/learning"),
  defect: parseDecisionId("january-1990/defect"),
} as const);

export type January1990DecisionId =
  (typeof JANUARY_1990_DECISION_IDS)[keyof typeof JANUARY_1990_DECISION_IDS];

const _decisionIdCompatibility: DecisionId = JANUARY_1990_DECISION_IDS.access;
void _decisionIdCompatibility;
