import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  RNG_DERIVATION_MANIFEST_V1,
  RNG_DOMAIN_PURPOSES_V1,
  Xoshiro256StarStar,
  createRngDomainPathV1,
  deriveRandomSource,
  deriveRngState,
  type RngDomainPathV1,
} from "@runtime-human/game-core";

const INITIAL_STATE = "0100000000000000020000000000000003000000000000000400000000000000";
const STATE_AFTER_TEN = "d3624311126c0460e60204001a9258402200861100365c08f9a2c09400bc2e3c";
const SEED_42_STATE = "956eeb2f2632d7bd03f166b233e3ef28529f0f135767524794e34a0effe11c58";
const HIERARCHICAL_NARRATIVE_STATE =
  "cbd1d4993ca722554bdf48ec727427540fd18209af1d22dc26013843e58f57a0";
const REFERENCE_OUTPUTS = [
  11520n,
  0n,
  1509978240n,
  1215971899390074240n,
  1216172134540287360n,
  607988272756665600n,
  16172922978634559625n,
  8476171486693032832n,
  10595114339597558777n,
  2904607092377533576n,
] as const;

describe("Xoshiro256StarStar", () => {
  it("matches the rand_xoshiro reference sequence and state", () => {
    const random = Xoshiro256StarStar.fromState(INITIAL_STATE);

    expect(REFERENCE_OUTPUTS.map(() => random.nextUint64())).toEqual(REFERENCE_OUTPUTS);
    expect(random.exportState()).toBe(STATE_AFTER_TEN);
  });

  it("matches SplitMix64 seed expansion", () => {
    expect(Xoshiro256StarStar.fromSeed(42n).exportState()).toBe(SEED_42_STATE);
  });

  it("restores an identical continuation", () => {
    const first = Xoshiro256StarStar.fromSeed(123n);
    first.nextUint64();
    const restored = Xoshiro256StarStar.fromState(first.exportState());

    expect(restored.nextUint64()).toBe(first.nextUint64());
  });

  it("generates integers inside a half-open safe-integer range", () => {
    const random = Xoshiro256StarStar.fromSeed(7n);

    for (let index = 0; index < 1_000; index += 1) {
      const value = random.nextInt(-17, 29);
      expect(value).toBeGreaterThanOrEqual(-17);
      expect(value).toBeLessThan(29);
      expect(Number.isSafeInteger(value)).toBe(true);
    }
  });

  it("selects weighted candidates and rejects invalid weights", () => {
    const random = Xoshiro256StarStar.fromSeed(9n);

    expect(random.weightedIndex([0, 5, 0])).toBe(1);
    expect(() => random.weightedIndex([])).toThrow();
    expect(() => random.weightedIndex([0, 0])).toThrow();
    expect(() => random.weightedIndex([1, -1])).toThrow();
    expect(() => random.weightedIndex([1, 0.5])).toThrow();
  });

  it("forks repeatable isolated streams without consuming the parent", () => {
    const parent = Xoshiro256StarStar.fromSeed(11n);
    const before = parent.exportState();
    const projectA = parent.fork("project/alpha");
    const projectB = parent.fork("project/alpha");
    const event = parent.fork("event/alpha");
    const emoji = parent.fork("project/😀");

    expect(parent.exportState()).toBe(before);
    expect(projectA.exportState()).toBe(projectB.exportState());
    expect(projectA.nextUint64()).toBe(projectB.nextUint64());
    expect(projectA.exportState()).not.toBe(event.exportState());
    expect(emoji.exportState()).toMatch(/^[0-9a-f]{64}$/u);
    expect(() => parent.fork("")).toThrow();
    expect(() => parent.fork("\ud800")).toThrow();
  });
});

describe("hierarchical RNG derivation", () => {
  it("publishes a closed v1 domain-to-purpose registry", () => {
    expect(RNG_DOMAIN_PURPOSES_V1).toEqual({
      content: ["selection"],
      narrative: ["event-selection", "variant"],
      outcome: ["quality-roll"],
      npc: ["action-choice", "tie-break"],
      project: ["work-package-outcome"],
    });
    expect(Object.isFrozen(RNG_DOMAIN_PURPOSES_V1)).toBe(true);
    for (const purposes of Object.values(RNG_DOMAIN_PURPOSES_V1)) {
      expect(Object.isFrozen(purposes)).toBe(true);
    }
  });

  it("builds the canonical v1 semantic path and golden state", () => {
    expect(RNG_DERIVATION_MANIFEST_V1).toEqual({
      algorithm: "xoshiro256ss-v1",
      derivationVersion: "hierarchical-v1",
      hashAlgorithm: "sha256-v1",
      serializationVersion: "canonical-json-v1",
    });

    const path = createRngDomainPathV1({
      month: "1990-01",
      domain: "narrative",
      entityId: "core.situation-kernel.first-bug",
      purpose: "event-selection",
    });
    expect(path).toEqual([
      "month:1990-01",
      "domain:narrative",
      "entity:core.situation-kernel.first-bug",
      "purpose:event-selection",
    ]);
    expect(Object.isFrozen(path)).toBe(true);
    expect(deriveRngState(SEED_42_STATE, path)).toBe(HIERARCHICAL_NARRATIVE_STATE);
    expect(deriveRandomSource(SEED_42_STATE, path).exportState()).toBe(
      HIERARCHICAL_NARRATIVE_STATE,
    );
  });

  it("keeps sibling domains independent of creation and consumption order", () => {
    const guardianPath = createRngDomainPathV1({
      month: "1990-01",
      domain: "npc",
      entityId: "npc.guardian",
      purpose: "action-choice",
    });
    const mentorPath = createRngDomainPathV1({
      month: "1990-01",
      domain: "npc",
      entityId: "npc.mentor",
      purpose: "action-choice",
    });

    const guardianFirst = deriveRandomSource(SEED_42_STATE, guardianPath);
    const mentorFirst = deriveRandomSource(SEED_42_STATE, mentorPath);
    guardianFirst.nextUint32();
    guardianFirst.nextUint32();

    const mentorAfterGuardianConsumption = deriveRandomSource(SEED_42_STATE, mentorPath);
    const guardianAfterMentorCreation = deriveRandomSource(SEED_42_STATE, guardianPath);

    expect(mentorAfterGuardianConsumption.exportState()).toBe(mentorFirst.exportState());
    expect(guardianAfterMentorCreation.exportState()).not.toBe(mentorFirst.exportState());
  });

  it("reproduces the same sequence for the same root and semantic path across generated inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 9_999 }),
        (seed, actorIndex) => {
          const root = Xoshiro256StarStar.fromSeed(BigInt(seed)).exportState();
          const path = createRngDomainPathV1({
            month: "1990-01",
            domain: "npc",
            entityId: `npc.actor-${String(actorIndex)}`,
            purpose: "action-choice",
          });
          const first = deriveRandomSource(root, path);
          const second = deriveRandomSource(root, path);
          const firstSequence = Array.from({ length: 6 }, () => first.nextUint64());
          const secondSequence = Array.from({ length: 6 }, () => second.nextUint64());

          expect(secondSequence).toEqual(firstSequence);
        },
      ),
      { numRuns: 128 },
    );
  });

  it("keeps generated sibling streams unchanged when another sibling consumes extra draws", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 64 }),
        (seed, extraDraws) => {
          const root = Xoshiro256StarStar.fromSeed(BigInt(seed)).exportState();
          const noisyPath = createRngDomainPathV1({
            month: "1990-01",
            domain: "npc",
            entityId: "npc.property-noisy",
            purpose: "action-choice",
          });
          const isolatedPath = createRngDomainPathV1({
            month: "1990-01",
            domain: "npc",
            entityId: "npc.property-isolated",
            purpose: "action-choice",
          });
          const isolatedBefore = deriveRandomSource(root, isolatedPath);
          const expected = Array.from({ length: 6 }, () => isolatedBefore.nextUint64());

          const noisy = deriveRandomSource(root, noisyPath);
          for (let draw = 0; draw < extraDraws; draw += 1) noisy.nextUint64();

          const isolatedAfter = deriveRandomSource(root, isolatedPath);
          const observed = Array.from({ length: 6 }, () => isolatedAfter.nextUint64());
          expect(observed).toEqual(expected);
        },
      ),
      { numRuns: 128 },
    );
  });

  it("rejects unstable identities, invalid purpose combinations and forged paths", () => {
    expect(() =>
      createRngDomainPathV1({
        month: "1990-13",
        domain: "npc",
        entityId: "npc.guardian",
        purpose: "action-choice",
      }),
    ).toThrow();
    expect(() =>
      createRngDomainPathV1({
        month: "1990-01",
        domain: "npc",
        entityId: "Guardian Smith",
        purpose: "action-choice",
      }),
    ).toThrow();
    expect(() =>
      createRngDomainPathV1({
        month: "1990-01",
        domain: "npc",
        entityId: "npc.guardián",
        purpose: "action-choice",
      }),
    ).toThrow();
    expect(() =>
      createRngDomainPathV1({
        month: "1990-01",
        domain: "npc",
        entityId: "npc.guardian",
        purpose: "variant",
      } as never),
    ).toThrow();

    const forgedPath = [
      "month:1990-01",
      "domain:npc",
      "entity:npc.guardian",
      "purpose:variant",
    ] as unknown as RngDomainPathV1;
    expect(() => deriveRngState(SEED_42_STATE, forgedPath)).toThrow();
  });
});
