import {
  JANUARY_1990_QUALITY_SCORE_MAXIMUMS,
  parseJanuary1990Result,
  type January1990ResultV1,
  type JanuaryQualityScoresV1,
} from "@runtime-human/game-core";

export { JANUARY_1990_QUALITY_SCORE_MAXIMUMS };

export type January1990QualityScores = JanuaryQualityScoresV1;

export type January1990ResultSummary = Readonly<{
  month: January1990ResultV1["month"];
  projectId: January1990ResultV1["projectId"];
  outcomeEventId: January1990ResultV1["outcomeEventId"];
  qualityScores: January1990QualityScores;
}>;

export function parseJanuary1990ResultSummary(value: unknown): January1990ResultSummary {
  const result = parseJanuary1990Result(value);
  return Object.freeze({
    month: result.month,
    projectId: result.projectId,
    outcomeEventId: result.outcomeEventId,
    qualityScores: result.programmingOutcome.qualityScores,
  });
}
