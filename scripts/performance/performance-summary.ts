export type DurationSummary = Readonly<{
  sampleCount: number;
  minMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}>;

export type WarningOnlyBudgetResult = Readonly<{
  status: "within-target" | "warning" | "unbudgeted";
  p95BudgetMs: number | null;
  exceedsBudget: boolean;
  enforcement: "warning-only";
}>;

export function summarizeDurations(samples: readonly number[]): DurationSummary {
  if (samples.length === 0) throw new RangeError("Performance samples must not be empty");
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < 0) {
      throw new RangeError("Performance samples must contain finite non-negative milliseconds");
    }
  }

  const sorted = samples.toSorted((left, right) => left - right);
  const mean = sorted.reduce((sum, sample) => sum + sample, 0) / sorted.length;
  return Object.freeze({
    sampleCount: sorted.length,
    minMs: roundMilliseconds(requireSample(sorted, 0)),
    meanMs: roundMilliseconds(mean),
    p50Ms: roundMilliseconds(nearestRank(sorted, 0.5)),
    p95Ms: roundMilliseconds(nearestRank(sorted, 0.95)),
    p99Ms: roundMilliseconds(nearestRank(sorted, 0.99)),
    maxMs: roundMilliseconds(requireSample(sorted, sorted.length - 1)),
  });
}

export function classifyWarningOnlyBudget(
  summary: DurationSummary,
  p95BudgetMs?: number,
): WarningOnlyBudgetResult {
  if (p95BudgetMs === undefined) {
    return Object.freeze({
      status: "unbudgeted",
      p95BudgetMs: null,
      exceedsBudget: false,
      enforcement: "warning-only",
    });
  }
  if (!Number.isFinite(p95BudgetMs) || p95BudgetMs <= 0) {
    throw new RangeError("Performance p95 budget must be a finite positive number");
  }

  const exceedsBudget = summary.p95Ms > p95BudgetMs;
  return Object.freeze({
    status: exceedsBudget ? "warning" : "within-target",
    p95BudgetMs,
    exceedsBudget,
    enforcement: "warning-only",
  });
}

function nearestRank(sorted: readonly number[], percentile: number): number {
  const index = Math.max(0, Math.ceil(percentile * sorted.length) - 1);
  return requireSample(sorted, index);
}

function requireSample(sorted: readonly number[], index: number): number {
  const value = sorted[index];
  if (value === undefined) {
    throw new RangeError(`Performance sample index ${index} is outside the collected range`);
  }
  return value;
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
