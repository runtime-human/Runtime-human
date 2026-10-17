/**
 * REF-02A1: isolated, deterministic January v2 balance oracle.
 * No v1 rules, persistence, content authority, or renderer integration.
 * Values are provisional: REF-02A2 must move them to validated JSONC.
 */
import {
  assertJanuaryV2ContextBalance,
  JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
  januaryV2ContextFinishModifier,
  januaryV2PracticeOpportunity,
  type JanuaryV2ContextBalance,
} from "./january-v2-context-balance";

export const JANUARY_V2_APPROACHES = [
  "investigate-first",
  "ask-for-help",
  "reduce-scope",
  "defer-or-recover",
] as const;
export type JanuaryV2Approach = (typeof JANUARY_V2_APPROACHES)[number];
export type JanuaryV2Context = Readonly<{
  startBackground: "home-pc" | "shared-school-pc";
  learningMode: "read-and-run" | "edit-and-debug";
  defect: "syntax-error" | "logic-error";
}>;
export type JanuaryV2Delivery = "released" | "released-with-limitation" | "delayed-to-february";
export type JanuaryV2Participation = "independent" | "assisted";
export type JanuaryV2Quality = "basic" | "adequate" | "strong";
export type JanuaryV2Cost =
  | "completion-risk"
  | "assistance"
  | "known-limitation"
  | "deferred-release";

export type JanuaryV2ApproachRule = Readonly<{
  finishThreshold: number;
  quality: JanuaryV2Quality;
  participation: JanuaryV2Participation;
  cost: JanuaryV2Cost;
  learningValue: number;
}>;
export type JanuaryV2ApproachTable = Readonly<Record<JanuaryV2Approach, JanuaryV2ApproachRule>>;
export type JanuaryV2Outcome = Readonly<{
  delivery: JanuaryV2Delivery;
  participation: JanuaryV2Participation;
  quality: JanuaryV2Quality;
  knownLimitation: boolean;
  learningMode: JanuaryV2Context["learningMode"];
  /** Bounded design opportunity; never an awarded skill or proficiency. */
  practiceOpportunity: number;
}>;

const QUALITY_RANK: Readonly<Record<JanuaryV2Quality, number>> = Object.freeze({
  basic: 1,
  adequate: 2,
  strong: 3,
});
const EXPECTED_COSTS: Readonly<Record<JanuaryV2Approach, JanuaryV2Cost>> = Object.freeze({
  "investigate-first": "completion-risk",
  "ask-for-help": "assistance",
  "reduce-scope": "known-limitation",
  "defer-or-recover": "deferred-release",
});

/** Canonical fixture for design validation only; not published balance authority. */
export const JANUARY_V2_PROVISIONAL_APPROACH_TABLE: JanuaryV2ApproachTable = Object.freeze({
  "investigate-first": Object.freeze({
    finishThreshold: 6,
    quality: "adequate",
    participation: "independent",
    cost: "completion-risk",
    learningValue: 2,
  }),
  "ask-for-help": Object.freeze({
    finishThreshold: 9,
    quality: "adequate",
    participation: "assisted",
    cost: "assistance",
    learningValue: 1,
  }),
  "reduce-scope": Object.freeze({
    finishThreshold: 10,
    quality: "basic",
    participation: "independent",
    cost: "known-limitation",
    learningValue: 0,
  }),
  "defer-or-recover": Object.freeze({
    finishThreshold: 0,
    quality: "strong",
    participation: "independent",
    cost: "deferred-release",
    learningValue: 2,
  }),
});

export const JANUARY_V2_DECLARED_CONTEXTS: readonly JanuaryV2Context[] = Object.freeze(
  (["home-pc", "shared-school-pc"] as const).flatMap((startBackground) =>
    (["read-and-run", "edit-and-debug"] as const).flatMap((learningMode) =>
      (["syntax-error", "logic-error"] as const).map((defect) =>
        Object.freeze({ startBackground, learningMode, defect }),
      ),
    ),
  ),
);

function assertContext(context: JanuaryV2Context): void {
  if (
    (context.startBackground !== "home-pc" && context.startBackground !== "shared-school-pc") ||
    (context.learningMode !== "read-and-run" && context.learningMode !== "edit-and-debug") ||
    (context.defect !== "syntax-error" && context.defect !== "logic-error")
  ) {
    throw new TypeError("Unknown January v2 context");
  }
}

export function januaryV2FinishThreshold(
  table: JanuaryV2ApproachTable,
  context: JanuaryV2Context,
  approach: JanuaryV2Approach,
  contextBalance: JanuaryV2ContextBalance = JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
): number {
  assertContext(context);
  const rule = table[approach];
  if (rule === undefined) throw new TypeError("Unknown January v2 approach");
  // Scope reduction guarantees a limited first release; deferral always waits.
  if (approach === "reduce-scope" || approach === "defer-or-recover") {
    return rule.finishThreshold;
  }
  return rule.finishThreshold + januaryV2ContextFinishModifier(context, approach, contextBalance);
}

/** The roll is supplied by the caller; this function never draws random values. */
export function resolveJanuaryV2Approach(
  table: JanuaryV2ApproachTable,
  context: JanuaryV2Context,
  approach: JanuaryV2Approach,
  outcomeRoll: number,
  contextBalance: JanuaryV2ContextBalance = JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
): JanuaryV2Outcome {
  if (!Number.isInteger(outcomeRoll) || outcomeRoll < 0 || outcomeRoll > 9) {
    throw new RangeError("January v2 outcome roll must be an integer from 0 to 9");
  }
  const threshold = januaryV2FinishThreshold(table, context, approach, contextBalance);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10) {
    throw new RangeError("January v2 finish threshold is outside [0,10]");
  }
  const rule = table[approach];
  const released = outcomeRoll < threshold;
  const delivery: JanuaryV2Delivery = !released
    ? "delayed-to-february"
    : approach === "reduce-scope"
      ? "released-with-limitation"
      : "released";
  return Object.freeze({
    delivery,
    participation: rule.participation,
    quality: rule.quality,
    knownLimitation: delivery === "released-with-limitation",
    learningMode: context.learningMode,
    practiceOpportunity: januaryV2PracticeOpportunity(table, context, approach, contextBalance),
  });
}

function dominates(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.every((value, index) => value >= (right[index] ?? Infinity)) &&
    left.some((value, index) => value > (right[index] ?? Infinity))
  );
}

function forecast(
  table: JanuaryV2ApproachTable,
  context: JanuaryV2Context,
  approach: JanuaryV2Approach,
  contextBalance: JanuaryV2ContextBalance,
): readonly number[] {
  const rule = table[approach];
  return [
    januaryV2FinishThreshold(table, context, approach, contextBalance),
    QUALITY_RANK[rule.quality],
    Number(rule.participation === "independent"),
    Number(approach !== "reduce-scope"),
    januaryV2PracticeOpportunity(table, context, approach, contextBalance),
  ];
}

/**
 * Exhaustive oracle over 2 backgrounds × 2 learning modes × 2 defects ×
 * 4 approaches × 10 rolls. Throws on dominated choices or false help benefit.
 * This is a development validator, not an authoring-language interpreter.
 */
export function assertJanuaryV2ApproachBalance(
  table: JanuaryV2ApproachTable,
  contextBalance: JanuaryV2ContextBalance = JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
): void {
  const keys = Object.keys(table).toSorted();
  if (JSON.stringify(keys) !== JSON.stringify([...JANUARY_V2_APPROACHES].toSorted())) {
    throw new TypeError("January v2 approaches must be a complete closed table");
  }
  for (const approach of JANUARY_V2_APPROACHES) {
    const rule = table[approach];
    if (
      !Number.isInteger(rule.finishThreshold) ||
      rule.finishThreshold < 0 ||
      rule.finishThreshold > 10 ||
      !Number.isInteger(rule.learningValue) ||
      rule.learningValue < 0 ||
      rule.learningValue > 2 ||
      !Object.hasOwn(QUALITY_RANK, rule.quality) ||
      (rule.participation !== "independent" && rule.participation !== "assisted") ||
      rule.cost !== EXPECTED_COSTS[approach] ||
      (approach !== "ask-for-help" && rule.participation !== "independent") ||
      (approach === "reduce-scope" && rule.finishThreshold !== 10) ||
      (approach === "defer-or-recover" && rule.finishThreshold !== 0)
    ) {
      throw new TypeError(`Invalid or cost-free January v2 approach: ${approach}`);
    }
  }
  if (
    table["ask-for-help"].participation !== "assisted" ||
    table["investigate-first"].participation !== "independent"
  ) {
    throw new TypeError("Assisted practice must not be claimed as independent");
  }
  assertJanuaryV2ContextBalance(table, contextBalance);
  for (const context of JANUARY_V2_DECLARED_CONTEXTS) {
    for (const approach of JANUARY_V2_APPROACHES) {
      const threshold = januaryV2FinishThreshold(table, context, approach, contextBalance);
      if (threshold < 0 || threshold > 10) {
        throw new RangeError("Unreachable January v2 context threshold");
      }
    }
    const help = januaryV2FinishThreshold(table, context, "ask-for-help", contextBalance);
    const solo = januaryV2FinishThreshold(table, context, "investigate-first", contextBalance);
    if (help <= solo) {
      throw new TypeError("Help must improve finish chance over investigation");
    }
    for (const first of JANUARY_V2_APPROACHES) {
      for (const second of JANUARY_V2_APPROACHES) {
        if (
          first !== second &&
          dominates(
            forecast(table, context, first, contextBalance),
            forecast(table, context, second, contextBalance),
          )
        ) {
          throw new TypeError(`January v2 Pareto dominance: ${first} over ${second}`);
        }
      }
    }
  }
  for (const learningMode of ["read-and-run", "edit-and-debug"] as const) {
    for (const defect of ["syntax-error", "logic-error"] as const) {
      const classes = (startBackground: JanuaryV2Context["startBackground"]) => {
        const context = { startBackground, learningMode, defect };
        const outcomes = new Set<string>();
        for (const approach of JANUARY_V2_APPROACHES) {
          for (let roll = 0; roll < 10; roll += 1) {
            const result = resolveJanuaryV2Approach(table, context, approach, roll, contextBalance);
            outcomes.add(`${result.delivery}:${result.quality}`);
          }
        }
        return [...outcomes].toSorted().join("|");
      };
      if (classes("home-pc") !== classes("shared-school-pc")) {
        throw new TypeError("Background changes reachable delivery/quality classes");
      }
    }
  }
}
