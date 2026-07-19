import { describe, expect, it } from "vitest";

import {
  DETERMINISM_MANIFEST_V1,
  parseSerializedXoshiro256State,
} from "@runtime-human/game-schema";

const VALID_STATE = "0100000000000000020000000000000003000000000000000400000000000000";

describe("determinism contracts", () => {
  it("exposes the exact immutable v1 manifest", () => {
    expect(DETERMINISM_MANIFEST_V1).toEqual({
      rulesVersion: "foundation-v1",
      rngAlgorithm: "xoshiro256ss-v1",
      hashAlgorithm: "sha256-v1",
      numericModel: "fixed-point-v1",
      calendarModel: "gregorian-v1",
      candidateSort: "stable-id-ascending-v1",
      effectOrdering: "phase-then-priority-then-stable-id-v1",
      serializationVersion: "canonical-json-v1",
    });
    expect(Object.isFrozen(DETERMINISM_MANIFEST_V1)).toBe(true);
  });

  it("accepts only canonical non-zero 32-byte state hex", () => {
    expect(parseSerializedXoshiro256State(VALID_STATE)).toBe(VALID_STATE);

    for (const invalid of [
      null,
      42,
      "",
      "00".repeat(32),
      VALID_STATE.toUpperCase(),
      `${VALID_STATE}00`,
      VALID_STATE.slice(2),
      `g${VALID_STATE.slice(1)}`,
    ]) {
      expect(() => parseSerializedXoshiro256State(invalid)).toThrow();
    }
  });
});
