import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { Xoshiro256StarStar } from "@runtime-human/game-core";

type GoldenFixture = Readonly<{
  version: "xoshiro256ss-v1";
  stateEncoding: "little-endian-32-byte-hex-v1";
  initialStateHex: string;
  outputsU64Decimal: readonly string[];
  stateAfterOutputsHex: string;
  seed42StateHex: string;
}>;

const fixture = parseFixture(
  JSON.parse(
    readFileSync(new URL("../fixtures/determinism/xoshiro256ss-v1.json", import.meta.url), "utf8"),
  ) as unknown,
);

describe("shared Xoshiro256** golden fixture", () => {
  it("matches the TypeScript adapter", () => {
    const random = Xoshiro256StarStar.fromState(fixture.initialStateHex);

    expect(fixture.outputsU64Decimal.map(() => random.nextUint64().toString())).toEqual(
      fixture.outputsU64Decimal,
    );
    expect(random.exportState()).toBe(fixture.stateAfterOutputsHex);
    expect(Xoshiro256StarStar.fromSeed(42n).exportState()).toBe(fixture.seed42StateHex);
  });
});

function parseFixture(value: unknown): GoldenFixture {
  if (!isRecord(value)) {
    throw new TypeError("Determinism fixture must be an object");
  }

  const outputs = value.outputsU64Decimal;
  if (
    value.version !== "xoshiro256ss-v1" ||
    value.stateEncoding !== "little-endian-32-byte-hex-v1" ||
    typeof value.initialStateHex !== "string" ||
    !Array.isArray(outputs) ||
    !outputs.every((output) => typeof output === "string") ||
    typeof value.stateAfterOutputsHex !== "string" ||
    typeof value.seed42StateHex !== "string"
  ) {
    throw new TypeError("Determinism fixture has an invalid shape");
  }

  return {
    version: value.version,
    stateEncoding: value.stateEncoding,
    initialStateHex: value.initialStateHex,
    outputsU64Decimal: outputs,
    stateAfterOutputsHex: value.stateAfterOutputsHex,
    seed42StateHex: value.seed42StateHex,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
