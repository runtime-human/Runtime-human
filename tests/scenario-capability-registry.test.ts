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
});
