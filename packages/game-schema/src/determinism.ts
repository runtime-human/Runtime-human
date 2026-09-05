const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;
const XOSHIRO256_STATE_PATTERN = /^[0-9a-f]{64}$/u;
const ZERO_XOSHIRO256_STATE = "0".repeat(64);

declare const stableIdBrand: unique symbol;
declare const fingerprintBrand: unique symbol;
declare const serializedXoshiro256StateBrand: unique symbol;

export type StableId = string & {
  readonly [stableIdBrand]: "StableId";
};

export type Fingerprint = string & {
  readonly [fingerprintBrand]: "Fingerprint";
};

export type SerializedXoshiro256State = string & {
  readonly [serializedXoshiro256StateBrand]: "SerializedXoshiro256State";
};

export type DeterminismManifest = Readonly<{
  rulesVersion: string;
  rngAlgorithm: "xoshiro256ss-v1";
  hashAlgorithm: "sha256-v1";
  numericModel: "fixed-point-v1";
  calendarModel: "gregorian-v1";
  candidateSort: "stable-id-ascending-v1";
  effectOrdering: "phase-then-priority-then-stable-id-v1";
  serializationVersion: "canonical-json-v1";
}>;

export type RngDerivationVersion = "hierarchical-v1";

export type RngDerivationManifestV1 = Readonly<{
  algorithm: "xoshiro256ss-v1";
  derivationVersion: RngDerivationVersion;
  hashAlgorithm: "sha256-v1";
  serializationVersion: "canonical-json-v1";
}>;

export const DETERMINISM_MANIFEST_V1: DeterminismManifest = Object.freeze({
  rulesVersion: "foundation-v1",
  rngAlgorithm: "xoshiro256ss-v1",
  hashAlgorithm: "sha256-v1",
  numericModel: "fixed-point-v1",
  calendarModel: "gregorian-v1",
  candidateSort: "stable-id-ascending-v1",
  effectOrdering: "phase-then-priority-then-stable-id-v1",
  serializationVersion: "canonical-json-v1",
});

export const RNG_DERIVATION_MANIFEST_V1: RngDerivationManifestV1 = Object.freeze({
  algorithm: "xoshiro256ss-v1",
  derivationVersion: "hierarchical-v1",
  hashAlgorithm: "sha256-v1",
  serializationVersion: "canonical-json-v1",
});

export function parseFingerprint(value: unknown, name = "Fingerprint"): Fingerprint {
  if (typeof value !== "string" || !FINGERPRINT_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a lowercase SHA-256 value`);
  }
  return value as Fingerprint;
}

export function parseSerializedXoshiro256State(value: unknown): SerializedXoshiro256State {
  if (typeof value !== "string" || !XOSHIRO256_STATE_PATTERN.test(value)) {
    throw new TypeError("Xoshiro256** state must be 32 lowercase hexadecimal bytes");
  }

  if (value === ZERO_XOSHIRO256_STATE) {
    throw new RangeError("Xoshiro256** state cannot be all zeroes");
  }

  return value as SerializedXoshiro256State;
}
