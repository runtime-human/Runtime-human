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

  if (value === null || typeof value === "boolean" || typeof value === "string") {
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
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      throw new TypeError(`Missing authoritative property descriptor at ${path}.${key}`);
    }
    validateDataDescriptor(descriptor, `${path}.${key}`);
    snapshot[key] = normalizeValue(descriptor.value, `${path}.${key}`, depth + 1, context);
  }
  return snapshot;
}

function validateDataDescriptor(descriptor: PropertyDescriptor, path: string): void {
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError(`Authoritative properties must be enumerable data values at ${path}`);
  }
}
