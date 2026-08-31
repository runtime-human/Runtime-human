import { describe, expect, it } from "vitest";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  createJanuary1990RngDomainPathsV1,
  deriveRandomSource,
  fingerprint,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_DEFAULT_BALANCE,
  RNG_DERIVATION_MANIFEST_V1,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import {
  createJanuary1990RngShadowReport,
  createJanuary1990Simulation,
  JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION,
} from "@runtime-human/game-simulation";

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

  it("emits a versioned byte-stable report without raw derived RNG state", () => {
    const first = createReport();
    const second = createReport();

    expect(second).toEqual(first);
    expect(first.schemaVersion).toBe(JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION);
    expect(first.derivationManifest).toEqual(RNG_DERIVATION_MANIFEST_V1);
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

  it("matches the committed golden report fingerprint", () => {
    expect(fingerprint("january-1990-rng-shadow-report-golden-v1", createReport())).toBe(
      "6dc47a16bc814091f27bbec8b08bccccd999fdb6fe37b3789875ec9c19ba3df2",
    );
  });

  it("keeps the outcome shadow stream independent from narrative consumption", () => {
    const paths = createJanuary1990RngDomainPathsV1(context);
    const narrative = deriveRandomSource(rootState, paths.narrativeEventSelection);
    const outcomeBefore = deriveRandomSource(rootState, paths.outcomeQualityRoll).exportState();

    narrative.nextUint64();
    narrative.nextUint64();
    narrative.nextUint64();

    expect(deriveRandomSource(rootState, paths.outcomeQualityRoll).exportState()).toBe(
      outcomeBefore,
    );
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
