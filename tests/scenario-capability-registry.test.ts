import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { fingerprint } from "@runtime-human/game-core";
import {
  MVP_CASUAL_SCENARIO_POLICY_V1,
  type ScenarioCapabilityRegistryV1,
  type ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";
import {
  certifyScenarioProgramV1,
  compileScenarioProgramV1,
  resolveScenarioCapabilitiesV1,
} from "@runtime-human/game-devtools";

const RULES_FINGERPRINT_NAMESPACE = "scenario-rules-v1";

function source(): ScenarioAuthoringDocument {
  return {
    schemaVersion: "scenario-v1",
    id: "capabilities.basic",
    entry: "a",
    nodes: {
      a: { kind: "provider", providerId: "provider.project", next: "b" },
      b: { kind: "random-content", poolId: "pool.narrative", next: "c" },
      c: { kind: "gate", predicateId: "predicate.ready", pass: "f", fail: "f" },
      f: { kind: "complete" },
    },
  };
}

function compile(document: ScenarioAuthoringDocument = source()) {
  const result = compileScenarioProgramV1(document, { fingerprint });
  if (result.kind !== "success") {
    throw new Error(`Expected compile success, got ${JSON.stringify(result.diagnostics)}`);
  }
  return result.program;
}

function registry(
  overrides: Partial<ScenarioCapabilityRegistryV1> = {},
): ScenarioCapabilityRegistryV1 {
  return {
    schemaVersion: "scenario-capability-registry-v1",
    providers: [
      {
        id: "provider.unused",
        version: 7,
        deterministic: true,
        rngBudgetMax: 9,
        effectDomain: "narrative",
      },
      {
        id: "provider.project",
        version: 2,
        deterministic: true,
        rngBudgetMax: 2,
        effectDomain: "project",
      },
    ],
    predicates: [
      {
        id: "predicate.unused",
        version: 4,
        deterministic: true,
        readOnly: true,
      },
      {
        id: "predicate.ready",
        version: 3,
        deterministic: true,
        readOnly: true,
      },
    ],
    ...overrides,
  };
}

function resolve(
  capabilityRegistry: ScenarioCapabilityRegistryV1 = registry(),
): ScenarioResolvedCapabilitiesV1 {
  const result = resolveScenarioCapabilitiesV1(compile(), capabilityRegistry, { fingerprint });
  if (result.kind !== "success") {
    throw new Error(
      `Expected capability resolution success, got ${JSON.stringify(result.diagnostics)}`,
    );
  }
  return result.capabilities;
}

function expectFailureCode(
  result: ReturnType<typeof certifyScenarioProgramV1>,
  expectedCode: string,
): void {
  expect(result.kind).toBe("failure");
  if (result.kind === "failure") {
    expect(result.diagnostics.map(({ code }) => code)).toContain(expectedCode);
  }
}

describe("scenario capability registry", () => {
  it("projects only referenced descriptors into a canonical fingerprinted rules contract", () => {
    const program = compile();
    const capabilities = resolve();
    const body = {
      schemaVersion: "scenario-resolved-capabilities-v1",
      programFingerprint: program.programFingerprint,
      providers: [
        {
          id: "provider.project",
          version: 2,
          deterministic: true,
          rngBudgetMax: 2,
          effectDomain: "project",
        },
      ],
      predicates: [
        {
          id: "predicate.ready",
          version: 3,
          deterministic: true,
          readOnly: true,
        },
      ],
      randomContentRngBudgetPerInstruction: 1,
    } as const;

    expect(capabilities).toEqual({
      ...body,
      rulesFingerprint: fingerprint(RULES_FINGERPRINT_NAMESPACE, body),
    });
  });

  it("is insensitive to registry ordering and unrelated descriptors", () => {
    const baseline = resolve();
    const reordered = resolve({
      ...registry(),
      providers: [...registry().providers].toReversed(),
      predicates: [...registry().predicates].toReversed(),
    });
    const withoutUnused = resolve({
      schemaVersion: "scenario-capability-registry-v1",
      providers: [registry().providers[1]!],
      predicates: [registry().predicates[1]!],
    });

    expect(reordered.rulesFingerprint).toBe(baseline.rulesFingerprint);
    expect(withoutUnused.rulesFingerprint).toBe(baseline.rulesFingerprint);
  });

  it("changes rules identity when referenced provider semantics change", () => {
    const baseline = resolve();
    const changed = resolve({
      ...registry(),
      providers: registry().providers.map((descriptor) =>
        descriptor.id === "provider.project"
          ? { ...descriptor, version: 3, rngBudgetMax: 4 }
          : descriptor,
      ),
    });

    expect(changed.rulesFingerprint).not.toBe(baseline.rulesFingerprint);
  });

  it("rejects unresolved provider and predicate ids with existing scenario diagnostics", () => {
    const program = compile();
    const missingProvider = resolveScenarioCapabilitiesV1(
      program,
      { ...registry(), providers: [] },
      { fingerprint },
    );
    const missingPredicate = resolveScenarioCapabilitiesV1(
      program,
      { ...registry(), predicates: [] },
      { fingerprint },
    );

    expect(missingProvider.kind).toBe("failure");
    if (missingProvider.kind === "failure") {
      expect(missingProvider.diagnostics.map(({ code }) => code)).toContain("SCN006");
    }
    expect(missingPredicate.kind).toBe("failure");
    if (missingPredicate.kind === "failure") {
      expect(missingPredicate.diagnostics.map(({ code }) => code)).toContain("SCN007");
    }
  });

  it("turns provider and random-content semantics into a numeric RNG upper bound", () => {
    const program = compile();
    const capabilities = resolve();
    const result = certifyScenarioProgramV1(
      program,
      MVP_CASUAL_SCENARIO_POLICY_V1,
      { fingerprint },
      capabilities,
    );

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.certificate.rulesFingerprint).toBe(capabilities.rulesFingerprint);
      expect(result.certificate.rngCallsMax).toBe(3);
      expect(result.certificate.providerCallsMax).toBe(1);
    }
  });

  it("rejects provider descriptors that are not closed runtime values", () => {
    const base = registry();
    const referenced = base.providers.find(({ id }) => id === "provider.project");
    if (referenced === undefined) throw new Error("missing provider.project fixture");

    const invalidEffectDomain = {
      ...base,
      providers: [{ ...referenced, effectDomain: "filesystem" }],
      predicates: [base.predicates[1]!],
    } as unknown as ScenarioCapabilityRegistryV1;
    const extraField = {
      ...base,
      providers: [{ ...referenced, hiddenMutationAuthority: true }],
      predicates: [base.predicates[1]!],
    } as unknown as ScenarioCapabilityRegistryV1;

    expect(() =>
      resolveScenarioCapabilitiesV1(compile(), invalidEffectDomain, { fingerprint }),
    ).toThrow();
    expect(() => resolveScenarioCapabilitiesV1(compile(), extraField, { fingerprint })).toThrow();
  });

  it("rejects a stale rules fingerprint after resolved provider semantics are forged", () => {
    const program = compile();
    const capabilities = resolve();
    const forged = {
      ...capabilities,
      providers: capabilities.providers.map((descriptor) => ({
        ...descriptor,
        rngBudgetMax: descriptor.rngBudgetMax + 1,
      })),
    } as ScenarioResolvedCapabilitiesV1;

    expectFailureCode(
      certifyScenarioProgramV1(program, MVP_CASUAL_SCENARIO_POLICY_V1, { fingerprint }, forged),
      "SCN012",
    );
  });

  it("fails closed when valid per-provider RNG budgets overflow the aggregate safe integer", () => {
    const program = compile({
      schemaVersion: "scenario-v1",
      id: "capabilities.overflow",
      entry: "a",
      nodes: {
        a: { kind: "provider", providerId: "provider.first", next: "b" },
        b: { kind: "provider", providerId: "provider.second", next: "f" },
        f: { kind: "complete" },
      },
    });
    const resolved = resolveScenarioCapabilitiesV1(
      program,
      {
        schemaVersion: "scenario-capability-registry-v1",
        providers: [
          {
            id: "provider.first",
            version: 1,
            deterministic: true,
            rngBudgetMax: Number.MAX_SAFE_INTEGER,
            effectDomain: "project",
          },
          {
            id: "provider.second",
            version: 1,
            deterministic: true,
            rngBudgetMax: 1,
            effectDomain: "project",
          },
        ],
        predicates: [],
      },
      { fingerprint },
    );
    if (resolved.kind !== "success") {
      throw new Error(`Expected resolution success, got ${JSON.stringify(resolved.diagnostics)}`);
    }

    expectFailureCode(
      certifyScenarioProgramV1(
        program,
        MVP_CASUAL_SCENARIO_POLICY_V1,
        { fingerprint },
        resolved.capabilities,
      ),
      "SCN013",
    );
  });
});
