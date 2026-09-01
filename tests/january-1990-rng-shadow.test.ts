import { describe, expect, it } from "vitest";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  createJanuary1990RngDomainPathsV1,
  createJanuary1990RulesFingerprint,
  deriveRandomSource,
  fingerprint,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_DEFAULT_BALANCE,
  RNG_DERIVATION_MANIFEST_V1,
  Xoshiro256StarStar,
  type January1990ContentContext,
} from "@runtime-human/game-core";
import {
  createJanuary1990RngShadowReport,
  createJanuary1990Simulation,
  JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION,
} from "@runtime-human/game-simulation";

import { createCountingRandomSource } from "../packages/game-simulation/src/rng-call-counter";
import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

const context = projectJanuary1990Content(await loadJanuaryTestRegistry());
const rootState = Xoshiro256StarStar.fromSeed(42n).exportState();

function createReport() {
  return createJanuary1990RngShadowReport({
    context,
    balance: JANUARY_1990_DEFAULT_BALANCE,
    rootState,
  });
}

describe("January 1990 hierarchical RNG shadow evidence", () => {
  it("owns stable semantic paths in the January core contract", () => {
    const paths = createJanuary1990RngDomainPathsV1(context);

    expect(paths.narrativeEventSelection).toEqual([
      "month:1990-01",
      "domain:narrative",
      `entity:${JANUARY_1990_CONTENT_IDS.firstBugSituation}`,
      "purpose:event-selection",
    ]);
    expect(paths.outcomeQualityRoll).toEqual([
      "month:1990-01",
      "domain:outcome",
      `entity:${JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage}`,
      "purpose:quality-roll",
    ]);
  });

  it("rejects a context that does not satisfy the full January context contract", () => {
    const invalidContext = {
      ...context,
      contentFingerprint: "not-a-fingerprint",
    } as unknown as January1990ContentContext;

    expect(() => createJanuary1990RngDomainPathsV1(invalidContext)).toThrow(
      "verified January 1990 content context",
    );
  });

  it("emits a versioned byte-stable report with exact source identities", () => {
    const first = createReport();
    const second = createReport();

    expect(second).toEqual(first);
    expect(first.schemaVersion).toBe(JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION);
    expect(first.derivationManifest).toEqual(RNG_DERIVATION_MANIFEST_V1);
    expect(first.contentFingerprint).toBe(context.contentFingerprint);
    expect(first.rulesetFingerprint).toBe(
      createJanuary1990RulesFingerprint(JANUARY_1990_DEFAULT_BALANCE),
    );
    expect(first.rootStateFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(first.domainCalls).toEqual({
      content: { declared: 0, observed: 0 },
      narrative: { declared: 1, observed: 1 },
      outcome: { declared: 1, observed: 1 },
    });
    expect(first.streams).toHaveLength(2);
    for (const stream of first.streams) {
      expect(stream.derivedStateFingerprint).toMatch(/^[0-9a-f]{64}$/u);
      expect(stream.postCallsStateFingerprint).toMatch(/^[0-9a-f]{64}$/u);
      expect(stream).not.toHaveProperty("derivedState");
      expect(stream).not.toHaveProperty("postCallsState");
    }
  });

  it("measures random-source calls instead of accepting a self-reported count", () => {
    const counted = createCountingRandomSource(Xoshiro256StarStar.fromSeed(7n));

    counted.random.nextInt(0, 2);
    counted.random.nextInt(0, 2);
    counted.random.weightedIndex([1, 1]);

    expect(counted.observedCalls()).toBe(3);
  });

  it("matches the committed golden report fingerprint", () => {
    expect(fingerprint("january-1990-rng-shadow-report-golden-v1", createReport())).toBe(
      "6dc47a16bc814091f27bbec8b08bccccd999fdb6fe37b3789875ec9c19ba3df2",
    );
  });

  it("keeps the outcome shadow stream independent from narrative consumption", () => {
    const baseline = createReport();
    const paths = createJanuary1990RngDomainPathsV1(context);
    const narrative = deriveRandomSource(rootState, paths.narrativeEventSelection);
    const baselineNarrative = baseline.streams.find((stream) => stream.domain === "narrative");
    const baselineOutcome = baseline.streams.find((stream) => stream.domain === "outcome");

    narrative.nextInt(0, context.situation.eventIds.length);
    narrative.nextInt(0, context.situation.eventIds.length);
    const narrativeWithExtraDrawFingerprint = fingerprint(
      "january-1990-rng-shadow-stream-state-v1",
      {
        path: paths.narrativeEventSelection,
        phase: "post-calls",
        state: narrative.exportState(),
      },
    );

    expect(narrativeWithExtraDrawFingerprint).not.toBe(
      baselineNarrative?.postCallsStateFingerprint,
    );
    expect(createReport().streams.find((stream) => stream.domain === "outcome"))
      .toEqual(baselineOutcome);
  });

  it("does not alter authoritative January execution", () => {
    const simulation = createJanuary1990Simulation({
      context,
      balance: JANUARY_1990_DEFAULT_BALANCE,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    });
    const before = simulation.runOnce({ seed: 42, policyId: "always-first-valid" });

    createReport();

    const after = simulation.runOnce({ seed: 42, policyId: "always-first-valid" });
    expect(after).toEqual(before);
  });
});
