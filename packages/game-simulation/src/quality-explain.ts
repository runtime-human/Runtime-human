import {
  type JanuaryBalanceAccessRoute,
  type JanuaryBalanceDefectResponse,
  type JanuaryBalanceLearningPractice,
  type JanuaryQualityScoresV1,
  type January1990BalanceV1,
} from "@runtime-human/game-core";

export const QUALITY_EXPLAIN_SCHEMA_VERSION = "quality-explain-v1" as const;
export const JANUARY_QUALITY_EXPLAIN_RULE_VERSION = "january-quality-v1" as const;

export type JanuaryQualityExplainInputsV1 = Readonly<{
  access: JanuaryBalanceAccessRoute;
  learning: JanuaryBalanceLearningPractice;
  response: JanuaryBalanceDefectResponse;
  roll: number;
}>;

export type JanuaryQualityExplainContributionV1 = Readonly<{
  reasonCode: string;
  clarity?: number;
  correctness?: number;
  reliability?: number;
}>;

export type JanuaryQualityExplanationV1 = Readonly<{
  schemaVersion: typeof QUALITY_EXPLAIN_SCHEMA_VERSION;
  ruleVersion: typeof JANUARY_QUALITY_EXPLAIN_RULE_VERSION;
  inputs: JanuaryQualityExplainInputsV1;
  contributions: readonly JanuaryQualityExplainContributionV1[];
  result: JanuaryQualityScoresV1;
}>;

export type JanuaryQualityExplainDiagnosticV1 = Readonly<{
  code: "EXPLAIN_INPUT_INVALID" | "EXPLAIN_ROLL_OUT_OF_RANGE" | "EXPLAIN_OUTCOME_MISMATCH";
  message: string;
}>;

export type JanuaryQualityExplainResultV1 =
  | Readonly<{ kind: "ok"; explanation: JanuaryQualityExplanationV1 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly JanuaryQualityExplainDiagnosticV1[] }>;

export type JanuaryOutcomeRollDerivationV1 =
  | Readonly<{ kind: "ok"; roll: number }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly JanuaryQualityExplainDiagnosticV1[] }>;

export type JanuaryOutcomeSelectionV1 = Readonly<{
  access: JanuaryBalanceAccessRoute;
  learning: JanuaryBalanceLearningPractice;
  response: JanuaryBalanceDefectResponse;
}>;

const DIMENSIONS = ["clarity", "correctness", "reliability"] as const;

export function explainJanuaryQualityV1(
  balance: January1990BalanceV1,
  inputs: JanuaryQualityExplainInputsV1,
): JanuaryQualityExplainResultV1 {
  const quality = balance.quality;
  const accessModifiers = quality.access[inputs.access];
  const learningModifiers = quality.learning[inputs.learning];
  const responseModifiers = quality.defectResponse[inputs.response];
  if (
    accessModifiers === undefined ||
    learningModifiers === undefined ||
    responseModifiers === undefined
  ) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: "EXPLAIN_INPUT_INVALID",
          message: "Explain inputs must be rows of the active January balance tables",
        },
      ],
    };
  }
  const roll = inputs.roll;
  if (
    !Number.isSafeInteger(roll) ||
    roll < quality.outcomeRoll.minimum ||
    roll > quality.outcomeRoll.maximum
  ) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: "EXPLAIN_ROLL_OUT_OF_RANGE",
          message: `Outcome roll must be a safe integer between ${quality.outcomeRoll.minimum} and ${quality.outcomeRoll.maximum}`,
        },
      ],
    };
  }

  const contributions = [
    contribution(
      "quality.base",
      quality.base.clarity,
      quality.base.correctness,
      quality.base.reliability,
    ),
    contribution("quality.access." + inputs.access, 0, 0, accessModifiers.reliability),
    contribution(
      "quality.learning." + inputs.learning,
      learningModifiers.clarity,
      learningModifiers.correctness,
      0,
    ),
    contribution(
      "quality.response." + inputs.response,
      responseModifiers.clarity,
      responseModifiers.correctness,
      responseModifiers.reliability,
    ),
    contribution("quality.roll", roll, roll, roll),
  ].filter((entry) => hasDimension(entry));

  const result: JanuaryQualityScoresV1 = Object.freeze({
    clarity: quality.base.clarity + learningModifiers.clarity + responseModifiers.clarity + roll,
    correctness:
      quality.base.correctness +
      learningModifiers.correctness +
      responseModifiers.correctness +
      roll,
    reliability:
      quality.base.reliability + accessModifiers.reliability + responseModifiers.reliability + roll,
  });

  return {
    kind: "ok",
    explanation: Object.freeze({
      schemaVersion: QUALITY_EXPLAIN_SCHEMA_VERSION,
      ruleVersion: JANUARY_QUALITY_EXPLAIN_RULE_VERSION,
      inputs: Object.freeze({ ...inputs }),
      contributions: Object.freeze(contributions),
      result,
    }),
  };
}

export function deriveJanuaryOutcomeRollV1(
  balance: January1990BalanceV1,
  selection: JanuaryOutcomeSelectionV1,
  scores: JanuaryQualityScoresV1,
): JanuaryOutcomeRollDerivationV1 {
  const quality = balance.quality;
  const accessModifiers = quality.access[selection.access];
  const learningModifiers = quality.learning[selection.learning];
  const responseModifiers = quality.defectResponse[selection.response];
  if (
    accessModifiers === undefined ||
    learningModifiers === undefined ||
    responseModifiers === undefined
  ) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: "EXPLAIN_INPUT_INVALID",
          message: "Outcome selection must be rows of the active January balance tables",
        },
      ],
    };
  }

  const candidates = DIMENSIONS.map((dimension) => {
    const base =
      quality.base[dimension] +
      (dimension === "reliability" ? accessModifiers.reliability : 0) +
      (dimension === "reliability" ? 0 : learningModifiers[dimension]) +
      responseModifiers[dimension];
    return scores[dimension] - base;
  });
  const roll = candidates[0];
  if (
    roll === undefined ||
    !Number.isSafeInteger(roll) ||
    candidates.some((candidate) => candidate !== roll) ||
    roll < quality.outcomeRoll.minimum ||
    roll > quality.outcomeRoll.maximum
  ) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: "EXPLAIN_OUTCOME_MISMATCH",
          message:
            "Quality scores do not decompose into one outcome roll for the given January selection",
        },
      ],
    };
  }
  return { kind: "ok", roll };
}

function hasDimension(entry: JanuaryQualityExplainContributionV1): boolean {
  return DIMENSIONS.some((dimension) => entry[dimension] !== undefined);
}

function contribution(
  reasonCode: string,
  clarity: number,
  correctness: number,
  reliability: number,
): JanuaryQualityExplainContributionV1 {
  const entry: {
    reasonCode: string;
    clarity?: number;
    correctness?: number;
    reliability?: number;
  } = { reasonCode };
  if (clarity !== 0) entry.clarity = clarity;
  if (correctness !== 0) entry.correctness = correctness;
  if (reliability !== 0) entry.reliability = reliability;
  return Object.freeze(entry);
}
