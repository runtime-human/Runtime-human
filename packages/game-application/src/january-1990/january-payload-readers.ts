import type { AuthoritativeJsonValue } from "@runtime-human/game-schema";

import { JanuaryContentProjectionError } from "./january-content-projection-error";
import type {
  JanuaryContentEntryPort,
  JanuaryContentRegistryPort,
} from "./january-content-registry-port";

export type JanuaryPayloadObject = Readonly<Record<string, AuthoritativeJsonValue>>;

export function requireJanuaryEntry(
  registry: JanuaryContentRegistryPort,
  contentId: string,
  expectedKind: JanuaryContentEntryPort["kind"],
): JanuaryContentEntryPort {
  const entry = registry.get(contentId);
  if (entry === undefined) {
    throw new JanuaryContentProjectionError(
      "MISSING_CONTENT",
      contentId,
      `Required January content is missing: ${contentId}`,
    );
  }
  if (entry.id !== contentId) {
    throw new JanuaryContentProjectionError(
      "INVALID_PAYLOAD",
      contentId,
      `January registry returned another stable ID for ${contentId}`,
    );
  }
  if (entry.kind !== expectedKind) {
    throw new JanuaryContentProjectionError(
      "WRONG_KIND",
      contentId,
      `January content ${contentId} must have kind ${expectedKind}`,
    );
  }
  return entry;
}

export function requireJanuaryReferences(
  entry: JanuaryContentEntryPort,
  expectedReferences: readonly string[],
): void {
  if (!sameStrings(entry.references, expectedReferences)) {
    throw new JanuaryContentProjectionError(
      "REFERENCE_MISMATCH",
      entry.id,
      `January content references do not match the approved graph: ${entry.id}`,
    );
  }
}

export function requireJanuaryPayload(
  entry: JanuaryContentEntryPort,
  contentType: string,
  expectedKeys: readonly string[],
): JanuaryPayloadObject {
  if (!isPlainObject(entry.payload)) {
    throw invalidPayload(entry.id, "payload must be a JSON object");
  }
  const payload = entry.payload;
  if (payload.contentType !== contentType) {
    throw new JanuaryContentProjectionError(
      "WRONG_CONTENT_TYPE",
      entry.id,
      `January content ${entry.id} must have contentType ${contentType}`,
    );
  }
  const actualKeys = Object.keys(payload).toSorted(compareText);
  const approvedKeys = [...expectedKeys].toSorted(compareText);
  if (!sameStrings(actualKeys, approvedKeys)) {
    throw invalidPayload(entry.id, "payload field set does not match the approved contract");
  }
  return payload;
}

export function requireLiteralString<const T extends string>(
  value: AuthoritativeJsonValue | undefined,
  expected: T,
  contentId: string,
  field: string,
): T {
  if (value !== expected) {
    throw invalidPayload(contentId, `${field} must equal ${expected}`);
  }
  return expected;
}

export function requireLiteralStringArray<const T extends readonly string[]>(
  value: AuthoritativeJsonValue | undefined,
  expected: T,
  contentId: string,
  field: string,
): T {
  if (!Array.isArray(value) || !sameStrings(value, expected)) {
    throw invalidPayload(contentId, `${field} does not match the approved values`);
  }
  return expected;
}

export function deepFreezeJanuary<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJanuary(child);
  return Object.freeze(value);
}

function invalidPayload(contentId: string, reason: string): JanuaryContentProjectionError {
  return new JanuaryContentProjectionError(
    "INVALID_PAYLOAD",
    contentId,
    `Invalid January content payload for ${contentId}: ${reason}`,
  );
}

function isPlainObject(value: unknown): value is Record<string, AuthoritativeJsonValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function sameStrings(left: readonly unknown[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
