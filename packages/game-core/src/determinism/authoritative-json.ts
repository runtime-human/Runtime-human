import canonicalize from "canonicalize";

export type AuthoritativeJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly AuthoritativeJsonValue[]
  | { readonly [key: string]: AuthoritativeJsonValue };

const MAX_DEPTH = 64;
const MAX_NODES = 100_000;
const HIGH_SURROGATE_START = 0xd800;
const HIGH_SURROGATE_END = 0xdbff;
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;

type ValidationContext = {
  readonly ancestors: Set<object>;
  nodes: number;
};

export function canonicalizeAuthoritative(value: unknown): string {
  const context: ValidationContext = {
    ancestors: new Set<object>(),
    nodes: 0,
  };
  const snapshot = normalizeValue(value, "$", 0, context);
  const result = canonicalize(snapshot);
  if (result === undefined) {
    throw new TypeError("Authoritative value cannot be represented as canonical JSON");
  }
  return result;
}

function normalizeValue(
  value: unknown,
  path: string,
  depth: number,
  context: ValidationContext,
): AuthoritativeJsonValue {
  context.nodes += 1;
  if (context.nodes > MAX_NODES) {
    throw new RangeError(`Authoritative value exceeds ${MAX_NODES} nodes`);
  }
  if (depth > MAX_DEPTH) {
    throw new RangeError(`Authoritative value exceeds depth ${MAX_DEPTH} at ${path}`);
  }

  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    assertWellFormedUnicode(value, path);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw new TypeError(`Authoritative number must be a safe integer at ${path}`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported authoritative value at ${path}`);
  }
  if (context.ancestors.has(value)) {
    throw new TypeError(`Circular authoritative value at ${path}`);
  }

  context.ancestors.add(value);
  try {
    return Array.isArray(value)
      ? normalizeArray(value, path, depth, context)
      : normalizeObject(value, path, depth, context);
  } finally {
    context.ancestors.delete(value);
  }
}

function normalizeArray(
  value: readonly unknown[],
  path: string,
  depth: number,
  context: ValidationContext,
): readonly AuthoritativeJsonValue[] {
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > MAX_NODES
  ) {
    throw new TypeError(`Invalid authoritative array length at ${path}`);
  }

  const length = lengthDescriptor.value;
  const keys = Reflect.ownKeys(value);
  const expectedKeys = new Set<string>(["length"]);
  const snapshot: AuthoritativeJsonValue[] = [];

  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      throw new TypeError(`Sparse authoritative array at ${path}[${key}]`);
    }
    validateDataDescriptor(descriptor, `${path}[${key}]`);
    snapshot.push(normalizeValue(descriptor.value, `${path}[${key}]`, depth + 1, context));
  }

  for (const key of keys) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      throw new TypeError(`Unexpected authoritative array property at ${path}`);
    }
  }

  return snapshot;
}

function normalizeObject(
  value: object,
  path: string,
  depth: number,
  context: ValidationContext,
): { readonly [key: string]: AuthoritativeJsonValue } {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`Authoritative object must be plain at ${path}`);
  }

  const snapshot = Object.create(null) as Record<string, AuthoritativeJsonValue>;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError(`Symbol keys are forbidden at ${path}`);
    }
    assertWellFormedUnicode(key, `${path} key`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      throw new TypeError(`Missing authoritative property descriptor at ${path}.${key}`);
    }
    validateDataDescriptor(descriptor, `${path}.${key}`);
    snapshot[key] = normalizeValue(descriptor.value, `${path}.${key}`, depth + 1, context);
  }
  return snapshot;
}

function assertWellFormedUnicode(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= HIGH_SURROGATE_START && codeUnit <= HIGH_SURROGATE_END) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit < LOW_SURROGATE_START || nextCodeUnit > LOW_SURROGATE_END) {
        throw new TypeError(`Lone Unicode surrogate is forbidden at ${path}`);
      }
      index += 1;
      continue;
    }
    if (codeUnit >= LOW_SURROGATE_START && codeUnit <= LOW_SURROGATE_END) {
      throw new TypeError(`Lone Unicode surrogate is forbidden at ${path}`);
    }
  }
}

function validateDataDescriptor(descriptor: PropertyDescriptor, path: string): void {
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError(`Authoritative properties must be enumerable data values at ${path}`);
  }
}
