import { describe, expect, it } from "vitest";

import { fingerprint, sha256Hex, stableId } from "@runtime-human/game-core";
import { parseFingerprint } from "@runtime-human/game-schema";

describe("deterministic hashing", () => {
  it("matches the SHA-256 standard vector", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("creates stable, namespace-separated IDs", () => {
    const first = stableId("project", { z: 2, a: 1 });
    const reordered = stableId("project", { a: 1, z: 2 });
    const otherNamespace = stableId("event", { a: 1, z: 2 });

    expect(first).toBe(reordered);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(first).not.toBe(otherNamespace);
  });

  it("separates stable IDs from fingerprints", () => {
    expect(stableId("rules", { version: 1 })).not.toBe(fingerprint("rules", { version: 1 }));
  });

  it("parses only canonical lowercase SHA-256 fingerprints", () => {
    const value = "162e470476ad0bd32194ee68dfdac80e14092b04c5b44a668315c47887a8117f";

    expect(parseFingerprint(value)).toBe(value);
    expect(() => parseFingerprint(value.toUpperCase())).toThrow("Fingerprint");
    expect(() => parseFingerprint("not-a-fingerprint")).toThrow("Fingerprint");
    expect(() => parseFingerprint(42)).toThrow("Fingerprint");
  });
});
