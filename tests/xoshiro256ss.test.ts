import { describe, expect, it } from "vitest";

import {
  RNG_DERIVATION_MANIFEST_V1,
  Xoshiro256StarStar,
  deriveRandomSource,
  deriveRngState,
} from "@runtime-human/game-core";

const INITIAL_STATE = "0100000000000000020000000000000003000000000000000400000000000000";
const STATE_AFTER_TEN = "d3624311126c0460e60204001a9258402200861100365c08f9a2c09400bc2e3c";
const SEED_42_STATE = "956eeb2f2632d7bd03f166b233e3ef28529f0f135767524794e34a0effe11c58";
const HIERARCHICAL_GUARDIAN_STATE =
  "c83d4d8410bb9caa5938d712edba988635b40a054e42fb4899e66c6c00f2ffd7";
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
  it("derives the stable hierarchical-v1 golden state", () => {
    expect(RNG_DERIVATION_MANIFEST_V1).toEqual({
      algorithm: "xoshiro256ss-v1",
      derivationVersion: "hierarchical-v1",
      hashAlgorithm: "sha256-v1",
      serializationVersion: "canonical-json-v1",
    });

    const path = ["month:1990-01", "npc", "guardian", "action-choice"] as const;
    expect(deriveRngState(SEED_42_STATE, path)).toBe(HIERARCHICAL_GUARDIAN_STATE);
    expect(deriveRandomSource(SEED_42_STATE, path).exportState()).toBe(
      HIERARCHICAL_GUARDIAN_STATE,
    );
  });

  it("keeps sibling domains independent of creation and consumption order", () => {
    const guardianPath = ["month:1990-01", "npc", "guardian", "action-choice"] as const;
    const mentorPath = ["month:1990-01", "npc", "mentor", "action-choice"] as const;

    const guardianFirst = deriveRandomSource(SEED_42_STATE, guardianPath);
    const mentorFirst = deriveRandomSource(SEED_42_STATE, mentorPath);
    guardianFirst.nextUint32();
    guardianFirst.nextUint32();

    const mentorAfterGuardianConsumption = deriveRandomSource(SEED_42_STATE, mentorPath);
    const guardianAfterMentorCreation = deriveRandomSource(SEED_42_STATE, guardianPath);

    expect(mentorAfterGuardianConsumption.exportState()).toBe(mentorFirst.exportState());
    expect(guardianAfterMentorCreation.exportState()).toBe(HIERARCHICAL_GUARDIAN_STATE);
    expect(mentorFirst.exportState()).not.toBe(HIERARCHICAL_GUARDIAN_STATE);
  });

  it("rejects ambiguous or malformed domain paths", () => {
    expect(() => deriveRngState(SEED_42_STATE, [])).toThrow();
    expect(() => deriveRngState(SEED_42_STATE, ["npc", ""])).toThrow();
    expect(() => deriveRngState(SEED_42_STATE, ["npc", "guardian\0action"])).toThrow();
    expect(() => deriveRngState(SEED_42_STATE, ["npc", "\ud800"])).toThrow();
  });
});
