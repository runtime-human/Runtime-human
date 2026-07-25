import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { generateJanuary1990BalanceTrace } from "./helpers/january-1990-balance-trace";

const GOLDEN_PATH = join(
  process.cwd(),
  "fixtures",
  "balance",
  "january-1990-bounded-trace-v1.json",
);

describe("January 1990 bounded balance trace", () => {
  it("matches the committed trace for 64 seeds and all 12 answer profiles", async () => {
    const trace = await generateJanuary1990BalanceTrace({ seedStart: 1, seedEnd: 64 });
    const golden = JSON.parse(await readFile(GOLDEN_PATH, "utf8")) as unknown;

    expect(trace).toEqual(golden);
    expect(trace).toMatchObject({
      schemaVersion: "january-1990-balance-trace-v1",
      seedRange: { start: 1, end: 64, count: 64 },
      answerProfiles: 12,
      totalRuns: 768,
      decisionBoundariesPerRun: 3,
      fixedStepsPerRun: 9,
      rngCallBudget: { content: 0, narrative: 1, outcome: 1 },
      failures: 0,
      softLocks: 0,
      programmerActionShare: { programmerActions: 2, totalDecisions: 3 },
    });
    expect(trace.defectEvents.logicError + trace.defectEvents.syntaxError).toBe(trace.totalRuns);
    expect(trace.defectEvents.logicError).toBeGreaterThan(0);
    expect(trace.defectEvents.syntaxError).toBeGreaterThan(0);
    expect(trace.responseQualityProfiles).toHaveLength(3);
  });
});
