import { describe, expect, it } from "vitest";

import {
  classifyWarningOnlyBudget,
  summarizeDurations,
} from "../scripts/performance/performance-summary";

describe("performance duration summaries", () => {
  it("uses nearest-rank percentiles over a sorted copy", () => {
    expect(summarizeDurations([4, 1, 3, 2])).toEqual({
      sampleCount: 4,
      minMs: 1,
      meanMs: 2.5,
      p50Ms: 2,
      p95Ms: 4,
      p99Ms: 4,
      maxMs: 4,
    });
  });

  it("rounds reported milliseconds to three decimals", () => {
    expect(summarizeDurations([0.333_34, 0.666_66])).toEqual({
      sampleCount: 2,
      minMs: 0.333,
      meanMs: 0.5,
      p50Ms: 0.333,
      p95Ms: 0.667,
      p99Ms: 0.667,
      maxMs: 0.667,
    });
  });

  it.each([
    ["empty", []],
    ["negative", [1, -1]],
    ["NaN", [Number.NaN]],
    ["infinite", [Number.POSITIVE_INFINITY]],
  ])("rejects %s samples", (_label, samples) => {
    expect(() => summarizeDurations(samples)).toThrow(RangeError);
  });
});

describe("warning-only performance budgets", () => {
  const summary = summarizeDurations([1, 2, 3, 4]);

  it("marks a met target without turning it into a gate", () => {
    expect(classifyWarningOnlyBudget(summary, 5)).toEqual({
      status: "within-target",
      p95BudgetMs: 5,
      exceedsBudget: false,
      enforcement: "warning-only",
    });
  });

  it("reports an exceeded target as a warning", () => {
    expect(classifyWarningOnlyBudget(summary, 3)).toEqual({
      status: "warning",
      p95BudgetMs: 3,
      exceedsBudget: true,
      enforcement: "warning-only",
    });
  });

  it("keeps scenarios without a target explicitly unbudgeted", () => {
    expect(classifyWarningOnlyBudget(summary)).toEqual({
      status: "unbudgeted",
      p95BudgetMs: null,
      exceedsBudget: false,
      enforcement: "warning-only",
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid p95 target %s",
    (budget) => {
      expect(() => classifyWarningOnlyBudget(summary, budget)).toThrow(RangeError);
    },
  );
});
