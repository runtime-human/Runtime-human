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

  validateValue(value, "$", 0, context);
  const result = canonicalize(value);
  if (result === undefined) {
    throw new TypeError("Authoritative value cannot be represented as canonical JSON");
  }
  return result;
}

function validateValue(
  value: unknown,
  path: string,
  depth: number,
  context: ValidationContext,
): asserts value is AuthoritativeJsonValue {
  context.nodes += 1;
  if (context.nodes > MAX_NODES) {
    throw new RangeError(`Authoritative value exceeds ${MAX_NODES} nodes`);
  }
  if (depth > MAX_DEPTH) {
    throw new RangeError(`Authoritative value exceeds depth ${MAX_DEPTH} at ${path}`);
  }

  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw new TypeError(`Authoritative number must be a safe integer at ${path}`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported authoritative value at ${path}`);
  }
  if (context.ancestors.has(value)) {
    throw new TypeError(`Circular authoritative value at ${path}`);
  }

  context.ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      validateArray(value, path, depth, context);
      return;
    }
    validateObject(value, path, depth, context);
  } finally {
    context.ancestors.delete(value);
  }
}

function validateArray(
  value: readonly unknown[],
  path: string,
  depth: number,
  context: ValidationContext,
): void {
  if (value.length > MAX_NODES) {
    throw new RangeError(`Authoritative array is too large at ${path}`);
  }
  const expectedKeys = new Set<string>(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      throw new TypeError(`Sparse authoritative array at ${path}[${key}]`);
    }
    validateDataDescriptor(descriptor, `${path}[${key}]`);
    validateValue(descriptor.value, `${path}[${key}]`, depth + 1, context);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      throw new TypeError(`Unexpected authoritative array property at ${path}`);
    }
  }
}

function validateObject(
  value: object,
  path: string,
  depth: number,
  context: ValidationContext,
): void {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`Authoritative object must be plain at ${path}`);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError(`Symbol keys are forbidden at ${path}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      throw new TypeError(`Missing authoritative property descriptor at ${path}.${key}`);
    }
    validateDataDescriptor(descriptor, `${path}.${key}`);
    validateValue(descriptor.value, `${path}.${key}`, depth + 1, context);
  }
}

function validateDataDescriptor(descriptor: PropertyDescriptor, path: string): void {
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError(`Authoritative properties must be enumerable data values at ${path}`);
  }
}
