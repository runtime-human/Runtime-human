import { describe, expect, it } from "vitest";

import {
  assertJanuaryV2ApproachBalance,
  JANUARY_V2_APPROACHES,
  JANUARY_V2_DECLARED_CONTEXTS,
  JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
  januaryV2FinishThreshold,
  resolveJanuaryV2Approach,
  type JanuaryV2ApproachTable,
} from "@runtime-human/game-core";

const table = JANUARY_V2_PROVISIONAL_APPROACH_TABLE;
const replace = (
  approach: keyof JanuaryV2ApproachTable,
  changes: Partial<JanuaryV2ApproachTable[typeof approach]>,
): JanuaryV2ApproachTable => ({
  ...table,
  [approach]: { ...table[approach], ...changes },
});

describe("REF-02A1 isolated January v2 balance oracle", () => {
  it("accepts the provisional closed four-approach contract", () => {
    expect(JANUARY_V2_APPROACHES).toHaveLength(4);
    expect(JANUARY_V2_DECLARED_CONTEXTS).toHaveLength(8);
    expect(() => assertJanuaryV2ApproachBalance(table)).not.toThrow();
  });

  it("replays identical outcomes with a caller-supplied roll, without RNG", () => {
    for (const context of JANUARY_V2_DECLARED_CONTEXTS) {
      for (const approach of JANUARY_V2_APPROACHES) {
        for (let roll = 0; roll < 10; roll += 1) {
          const first = resolveJanuaryV2Approach(table, context, approach, roll);
          const second = resolveJanuaryV2Approach(table, context, approach, roll);
          expect(first).toEqual(second);
          expect(Object.isFrozen(first)).toBe(true);
        }
      }
    }
  });

  it("gives help a strictly greater finish chance and never autonomous participation", () => {
    for (const context of JANUARY_V2_DECLARED_CONTEXTS) {
      const help = Array.from({ length: 10 }, (_, roll) =>
        resolveJanuaryV2Approach(table, context, "ask-for-help", roll),
      );
      const solo = Array.from({ length: 10 }, (_, roll) =>
        resolveJanuaryV2Approach(table, context, "investigate-first", roll),
      );
      expect(help.filter((r) => r.delivery === "released").length).toBeGreaterThan(
        solo.filter((r) => r.delivery === "released").length,
      );
      expect(help.every((r) => r.participation === "assisted")).toBe(true);
      expect(solo.every((r) => r.participation === "independent")).toBe(true);
    }
  });

  it("preserves trade-offs: limited release and deliberate deferral", () => {
    for (const context of JANUARY_V2_DECLARED_CONTEXTS) {
      for (let roll = 0; roll < 10; roll += 1) {
        const scope = resolveJanuaryV2Approach(table, context, "reduce-scope", roll);
        const defer = resolveJanuaryV2Approach(table, context, "defer-or-recover", roll);
        expect(scope.delivery).toBe("released-with-limitation");
        expect(scope.knownLimitation).toBe(true);
        expect(defer.delivery).toBe("delayed-to-february");
        expect(defer.quality).toBe("strong");
      }
    }
  });

  it("never makes shared-school access a capability or quality ceiling", () => {
    for (const learningMode of ["read-and-run", "edit-and-debug"] as const) {
      for (const defect of ["syntax-error", "logic-error"] as const) {
        const outcomes = (startBackground: "home-pc" | "shared-school-pc") =>
          JANUARY_V2_APPROACHES.flatMap((approach) =>
            Array.from({ length: 10 }, (_, roll) =>
              resolveJanuaryV2Approach(
                table,
                { startBackground, learningMode, defect },
                approach,
                roll,
              ),
            ),
          );
        const classes = (startBackground: "home-pc" | "shared-school-pc") =>
          [
            ...new Set(outcomes(startBackground).map((r) => `${r.delivery}:${r.quality}`)),
          ].toSorted();
        expect(classes("home-pc")).toEqual(classes("shared-school-pc"));
      }
    }
  });

  it("makes exploratory learning riskier than reading, without inventing credit", () => {
    for (const startBackground of ["home-pc", "shared-school-pc"] as const) {
      for (const defect of ["syntax-error", "logic-error"] as const) {
        const context = { startBackground, defect };
        expect(
          januaryV2FinishThreshold(
            table,
            { ...context, learningMode: "read-and-run" },
            "investigate-first",
          ),
        ).toBeGreaterThan(
          januaryV2FinishThreshold(
            table,
            { ...context, learningMode: "edit-and-debug" },
            "investigate-first",
          ),
        );
      }
    }
  });

  it("rejects dominated, cost-free and incomplete candidate tables", () => {
    expect(() =>
      assertJanuaryV2ApproachBalance(
        replace("investigate-first", {
          finishThreshold: 10,
          quality: "strong",
          learningValue: 2,
        }),
      ),
    ).toThrow(/dominance|chance/u);
    expect(() =>
      assertJanuaryV2ApproachBalance(replace("ask-for-help", { cost: "completion-risk" })),
    ).toThrow(/cost-free/u);
    const incomplete = { ...table } as Record<string, unknown>;
    delete incomplete["reduce-scope"];
    expect(() => assertJanuaryV2ApproachBalance(incomplete as JanuaryV2ApproachTable)).toThrow(
      /closed/u,
    );
    expect(() =>
      assertJanuaryV2ApproachBalance(replace("ask-for-help", { finishThreshold: 6 })),
    ).toThrow(/chance/u);
  });

  it("rejects prototype quality names and false guaranteed-approach semantics", () => {
    expect(() =>
      assertJanuaryV2ApproachBalance(
        replace("investigate-first", { quality: "toString" as "strong" }),
      ),
    ).toThrow(/Invalid/u);
    expect(() =>
      assertJanuaryV2ApproachBalance(replace("reduce-scope", { finishThreshold: 9 })),
    ).toThrow(/Invalid/u);
    expect(() =>
      assertJanuaryV2ApproachBalance(replace("defer-or-recover", { finishThreshold: 1 })),
    ).toThrow(/Invalid/u);
    expect(() =>
      assertJanuaryV2ApproachBalance(replace("investigate-first", { participation: "assisted" })),
    ).toThrow(/Invalid/u);
  });

  it("rejects invalid rolls and an impossible context", () => {
    const context = JANUARY_V2_DECLARED_CONTEXTS[0]!;
    for (const roll of [-1, 10, 1.5, NaN]) {
      expect(() => resolveJanuaryV2Approach(table, context, "ask-for-help", roll)).toThrow(
        RangeError,
      );
    }
    expect(() =>
      resolveJanuaryV2Approach(
        table,
        { ...context, startBackground: "unknown" as "home-pc" },
        "ask-for-help",
        0,
      ),
    ).toThrow(TypeError);
  });
});
