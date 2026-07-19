import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Fingerprint, StableId } from "@runtime-human/game-schema";

import { canonicalizeAuthoritative } from "./authoritative-json";

const textEncoder = new TextEncoder();

export function sha256Hex(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  return bytesToHex(sha256(bytes));
}

export function stableId(namespace: string, value: unknown): StableId {
  return hashDomain("runtime-human:stable-id:v1", namespace, value) as StableId;
}

export function fingerprint(namespace: string, value: unknown): Fingerprint {
  return hashDomain("runtime-human:fingerprint:v1", namespace, value) as Fingerprint;
}

function hashDomain(domain: string, namespace: string, value: unknown): string {
  validateNamespace(namespace);
  return sha256Hex(
    canonicalizeAuthoritative({
      domain,
      namespace,
      value,
    }),
  );
}

function validateNamespace(namespace: string): void {
  if (namespace.length === 0 || namespace.length > 256 || namespace.includes("\0")) {
    throw new TypeError("Hash namespace must contain 1-256 characters without NUL");
  }
}
