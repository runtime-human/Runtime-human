import { describe, expect, it } from "vitest";

import { canonicalizeAuthoritative } from "@runtime-human/game-core";

describe("canonicalizeAuthoritative", () => {
  it("canonicalizes object keys without changing array order", () => {
    expect(canonicalizeAuthoritative({ z: 1, a: [3, 2, 1] })).toBe('{"a":[3,2,1],"z":1}');
    expect(canonicalizeAuthoritative({ a: [1, 2, 3], z: 1 })).not.toBe(
      canonicalizeAuthoritative({ a: [3, 2, 1], z: 1 }),
    );
  });

  it("allows repeated acyclic references", () => {
    const shared = { value: 7 };

    expect(canonicalizeAuthoritative({ left: shared, right: shared })).toBe(
      '{"left":{"value":7},"right":{"value":7}}',
    );
  });

  it("canonicalizes a validated snapshot instead of rereading the source", () => {
    let propertyReads = 0;
    const source = new Proxy(
      {},
      {
        ownKeys: () => ["value"],
        getOwnPropertyDescriptor: () => ({
          configurable: true,
          enumerable: true,
          value: 1,
          writable: true,
        }),
        get: () => {
          propertyReads += 1;
          return 2;
        },
      },
    );

    expect(canonicalizeAuthoritative(source)).toBe('{"value":1}');
    expect(propertyReads).toBe(0);
  });

  it("rejects values that JSON canonicalization would erase or reinterpret", () => {
    const sparse: unknown[] = [];
    sparse.length = 1;
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    class DomainValue {
      readonly value = 1;
    }

    const withAccessor = {};
    Object.defineProperty(withAccessor, "value", {
      enumerable: true,
      get: () => 1,
    });

    const withHidden = { visible: 1 };
    Object.defineProperty(withHidden, "hidden", {
      enumerable: false,
      value: 2,
    });

    const arrayWithProperty = [1] as number[] & { extra?: number };
    arrayWithProperty.extra = 2;

    const invalidValues: readonly unknown[] = [
      undefined,
      1n,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      -0,
      Symbol("value"),
      () => 1,
      new Date(0),
      new DomainValue(),
      sparse,
      cyclic,
      withAccessor,
      withHidden,
      arrayWithProperty,
    ];

    for (const value of invalidValues) {
      expect(() => canonicalizeAuthoritative(value)).toThrow();
    }
  });
});
