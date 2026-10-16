import type {
  JanuaryV2Approach,
  JanuaryV2ApproachTable,
  JanuaryV2Context,
} from "./january-v2-approach-oracle";

export type JanuaryV2ContextBalance = Readonly<{
  startBackground: Readonly<Record<
    JanuaryV2Context["startBackground"],
    Readonly<Record<"investigate-first" | "ask-for-help", number>>
  >>;
  learningMode: Readonly<Record<
    JanuaryV2Context["learningMode"],
    Readonly<{ finishModifier: number; practiceOpportunityModifier: number }>
  >>;
  defect: Readonly<Record<JanuaryV2Context["defect"], number>>;
}>;

/**
 * Provisional frozen v2 snapshot. It is NOT a skill award, an NPC interaction,
 * a January v1 override, or a persisted production rule.
 */
export const JANUARY_V2_DEFAULT_CONTEXT_BALANCE: JanuaryV2ContextBalance = Object.freeze({
  startBackground: Object.freeze({
    "home-pc": Object.freeze({ "investigate-first": 1, "ask-for-help": -1 }),
    "shared-school-pc": Object.freeze({ "investigate-first": -1, "ask-for-help": 1 }),
  }),
  learningMode: Object.freeze({
    "read-and-run": Object.freeze({ finishModifier: 0, practiceOpportunityModifier: -1 }),
    "edit-and-debug": Object.freeze({ finishModifier: -1, practiceOpportunityModifier: 1 }),
  }),
  defect: Object.freeze({ "syntax-error": 0, "logic-error": -1 }),
});

export function januaryV2ContextFinishModifier(
  context: JanuaryV2Context,
  approach: JanuaryV2Approach,
  balance: JanuaryV2ContextBalance = JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
): number {
  if (approach === "reduce-scope" || approach === "defer-or-recover") return 0;
  const background = balance.startBackground[context.startBackground]?.[approach];
  const learning = balance.learningMode[context.learningMode]?.finishModifier;
  const defect = balance.defect[context.defect];
  if (![background, learning, defect].every(Number.isSafeInteger)) {
    throw new TypeError("Invalid January v2 context modifier");
  }
  return background + learning + defect;
}

/** Opportunity to practice only; not mastery, evidence, a grade, or a reward. */
export function januaryV2PracticeOpportunity(
  table: JanuaryV2ApproachTable,
  context: JanuaryV2Context,
  approach: JanuaryV2Approach,
  balance: JanuaryV2ContextBalance = JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
): number {
  const base = table[approach]?.learningValue;
  const modifier = balance.learningMode[context.learningMode]?.practiceOpportunityModifier;
  if (!Number.isSafeInteger(base) || !Number.isSafeInteger(modifier)) {
    throw new TypeError("Invalid January v2 practice opportunity");
  }
  return Math.max(0, Math.min(3, base + modifier));
}

const BACKGROUNDS = ["home-pc", "shared-school-pc"] as const;
const LEARNING_MODES = ["read-and-run", "edit-and-debug"] as const;
const DEFECTS = ["syntax-error", "logic-error"] as const;
const RELEASE_APPROACHES = ["investigate-first", "ask-for-help"] as const;

function validateClosedObject(value: object, keys: readonly string[]): void {
  if (
    JSON.stringify(Object.keys(value).toSorted()) !==
    JSON.stringify([...keys].toSorted())
  ) {
    throw new TypeError("Incomplete or extended January v2 context modifiers");
  }
}

/**
 * Exhaustive comparison of the visible timing/practice trade-offs.
 * A background cannot dominate when home wins independent investigation and
 * shared-school wins help. Read-and-run wins timing, edit-and-debug wins
 * practice opportunity. This is not a proof about future career paths.
 */
export function assertJanuaryV2ContextBalance(
  table: JanuaryV2ApproachTable,
  balance: JanuaryV2ContextBalance,
): void {
  validateClosedObject(balance, ["startBackground", "learningMode", "defect"]);
  validateClosedObject(balance.startBackground, BACKGROUNDS);
  validateClosedObject(balance.learningMode, LEARNING_MODES);
  validateClosedObject(balance.defect, DEFECTS);
  for (const background of BACKGROUNDS) {
    validateClosedObject(balance.startBackground[background], RELEASE_APPROACHES);
    for (const approach of RELEASE_APPROACHES) {
      const modifier = balance.startBackground[background][approach];
      if (!Number.isSafeInteger(modifier) || modifier < -2 || modifier > 2) {
        throw new TypeError("Invalid background timing modifier");
      }
    }
  }
  for (const mode of LEARNING_MODES) {
    const entry = balance.learningMode[mode];
    validateClosedObject(entry, ["finishModifier", "practiceOpportunityModifier"]);
    if (
      !Number.isSafeInteger(entry.finishModifier) ||
      entry.finishModifier < -2 ||
      entry.finishModifier > 2 ||
      !Number.isSafeInteger(entry.practiceOpportunityModifier) ||
      entry.practiceOpportunityModifier < -2 ||
      entry.practiceOpportunityModifier > 2
    ) {
      throw new TypeError("Invalid learning trade-off");
    }
  }
  for (const defect of DEFECTS) {
    const modifier = balance.defect[defect];
    if (!Number.isSafeInteger(modifier) || modifier < -2 || modifier > 2) {
      throw new TypeError("Invalid defect modifier");
    }
  }

  for (const learningMode of LEARNING_MODES) {
    for (const defect of DEFECTS) {
      const threshold = (startBackground: JanuaryV2Context["startBackground"], approach: typeof RELEASE_APPROACHES[number]) => {
        const context = { startBackground, learningMode, defect };
        return table[approach].finishThreshold + januaryV2ContextFinishModifier(context, approach, balance);
      };
      if (
        threshold("home-pc", "investigate-first") <= threshold("shared-school-pc", "investigate-first") ||
        threshold("shared-school-pc", "ask-for-help") <= threshold("home-pc", "ask-for-help")
      ) {
        throw new TypeError("January v2 background Pareto dominance");
      }
    }
  }
  for (const startBackground of BACKGROUNDS) {
    for (const defect of DEFECTS) {
      for (const approach of RELEASE_APPROACHES) {
        const context = (learningMode: JanuaryV2Context["learningMode"]) =>
          ({ startBackground, defect, learningMode });
        const read = context("read-and-run");
        const edit = context("edit-and-debug");
        const readThreshold = table[approach].finishThreshold +
          januaryV2ContextFinishModifier(read, approach, balance);
        const editThreshold = table[approach].finishThreshold +
          januaryV2ContextFinishModifier(edit, approach, balance);
        if (
          readThreshold <= editThreshold ||
          januaryV2PracticeOpportunity(table, edit, approach, balance) <=
          januaryV2PracticeOpportunity(table, read, approach, balance)
        ) {
          throw new TypeError("January v2 learning mode Pareto dominance");
        }
      }
    }
  }
}
