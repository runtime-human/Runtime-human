import type { Fingerprint } from "@runtime-human/game-schema";

import { CompiledContentError } from "./content-errors";

const MAX_ARTIFACT_BYTES = 4 * 1024 * 1024;
const MAX_JSON_DEPTH = 64;
const MAX_JSON_NODES = 100_000;
const MAX_COLLECTION_SIZE = 50_000;
const MAX_OBJECT_KEYS = 512;
const MAX_STRING_LENGTH = 1_000_000;
const MAX_IDENTIFIER_LENGTH = 160;
const MAX_CHUNK_SEGMENT_LENGTH = 80;

const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const CHUNK_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export type JsonObject = Record<string, unknown>;
type JsonTreeItem = Readonly<{ value: unknown; depth: number }>;

export function parseCanonicalJsonArtifact(
  json: string,
  artifact: string,
  canonicalize: (value: unknown) => string,
): unknown {
  if (utf8ByteLength(json) > MAX_ARTIFACT_BYTES) {
    throw invalidShape(`${artifact} exceeds the runtime artifact byte limit`, artifact);
  }

  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    throw new CompiledContentError("INVALID_JSON", `Invalid JSON in compiled content ${artifact}`, {
      artifact,
    });
  }

  validateJsonTree(value, artifact);
  let canonical: string;
  try {
    canonical = canonicalize(value);
  } catch {
    throw invalidShape(`${artifact} cannot be canonicalized`, artifact);
  }
  if (json !== canonical && json !== `${canonical}\n`) {
    throw invalidShape(`${artifact} must use canonical compiled JSON bytes`, artifact);
  }
  return value;
}

export function validateJsonTree(root: unknown, artifact: string): void {
  const stack: JsonTreeItem[] = [{ value: root, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === undefined) break;
    nodes += 1;
    if (nodes > MAX_JSON_NODES) {
      throw invalidShape(`${artifact} exceeds the node limit`, artifact);
    }
    if (item.depth > MAX_JSON_DEPTH) {
      throw invalidShape(`${artifact} exceeds the depth limit`, artifact);
    }
    enqueueChildren(item, stack, artifact);
  }
}

export function requireObject(value: unknown, path: string): JsonObject {
  if (!isPlainObject(value)) throw invalidShape(`${path} must be an object`, path);
  return value;
}

export function requireExactKeys(
  object: JsonObject,
  expectedKeys: readonly string[],
  path: string,
): void {
  const actual = Object.keys(object).toSorted(compareText);
  const expected = [...expectedKeys].toSorted(compareText);
  if (!sameStrings(actual, expected)) {
    throw invalidShape(`${path} has an invalid field set`, path);
  }
}

export function requireArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw invalidShape(`${path} must be an array`, path);
  return value;
}

export function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw invalidShape(`${path} must be a non-empty string`, path);
  }
  return value;
}

export function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw invalidShape(`${path} must be a boolean`, path);
  return value;
}

export function requireBoundedString(value: unknown, path: string, maximumLength: number): string {
  const text = requireString(value, path);
  if (Array.from(text).length > maximumLength) {
    throw invalidShape(`${path} exceeds ${maximumLength} characters`, path);
  }
  return text;
}

export function requireIdentifier(value: unknown, path: string): string {
  const identifier = requireBoundedString(value, path, MAX_IDENTIFIER_LENGTH);
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw invalidShape(`${path} is not a valid identifier`, path);
  }
  return identifier;
}

export function requireChunkSegment(value: unknown, path: string): string {
  const segment = requireBoundedString(value, path, MAX_CHUNK_SEGMENT_LENGTH);
  if (!CHUNK_SEGMENT_PATTERN.test(segment)) {
    throw invalidShape(`${path} is not a valid chunk segment`, path);
  }
  return segment;
}

export function requireChunkId(value: unknown, path: string): string {
  const chunkId = requireString(value, path);
  const parts = chunkId.split("/");
  if (parts.length !== 2) throw invalidShape(`${path} is not a valid chunk ID`, path);
  const era = requireChunkSegment(parts[0], `${path}.era`);
  const domain = requireIdentifier(parts[1], `${path}.domain`);
  if (chunkId !== `${era}/${domain}`) {
    throw invalidShape(`${path} is not a valid chunk ID`, path);
  }
  return chunkId;
}

export function requireMonth(value: unknown, path: string): string {
  const month = requireString(value, path);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw invalidShape(`${path} must use YYYY-MM`, path);
  }
  return month;
}

export function requireFingerprint(value: unknown, path: string): Fingerprint {
  const fingerprint = requireString(value, path);
  if (!FINGERPRINT_PATTERN.test(fingerprint)) {
    throw invalidShape(`${path} must be a lowercase SHA-256 fingerprint`, path);
  }
  return fingerprint as Fingerprint;
}

export function isFingerprint(value: string): boolean {
  return FINGERPRINT_PATTERN.test(value);
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function invalidShape(message: string, path: string): CompiledContentError {
  return new CompiledContentError("INVALID_SHAPE", message, { path });
}

export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function enqueueChildren(item: JsonTreeItem, stack: JsonTreeItem[], artifact: string): void {
  const { value, depth } = item;
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    validateString(value, artifact);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw invalidShape(`${artifact} contains a non-authoritative number`, artifact);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_COLLECTION_SIZE) {
      throw invalidShape(`${artifact} exceeds the array-size limit`, artifact);
    }
    for (let index = value.length - 1; index >= 0; index -= 1) {
      stack.push({ value: value[index], depth: depth + 1 });
    }
    return;
  }
  if (!isPlainObject(value)) {
    throw invalidShape(`${artifact} contains a non-JSON value`, artifact);
  }
  const keys = Object.keys(value);
  if (keys.length > MAX_OBJECT_KEYS) {
    throw invalidShape(`${artifact} exceeds the object-key limit`, artifact);
  }
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    const key = keys[index];
    if (key === undefined) continue;
    validateString(key, artifact);
    stack.push({ value: value[key], depth: depth + 1 });
  }
}

function validateString(value: string, path: string): void {
  if (value.length > MAX_STRING_LENGTH) {
    throw invalidShape(`${path} exceeds the string limit`, path);
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        throw invalidShape(`${path} contains invalid Unicode`, path);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw invalidShape(`${path} contains invalid Unicode`, path);
    }
  }
}

function isPlainObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
    if (bytes > MAX_ARTIFACT_BYTES) return bytes;
  }
  return bytes;
}
