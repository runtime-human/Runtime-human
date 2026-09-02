import type {
  Fingerprint,
  ScenarioCapabilityRegistryV1,
  ScenarioPredicateDescriptorV1,
  ScenarioProgramV1,
  ScenarioProviderDescriptorV1,
  ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";

import type { StructuredDiagnosticV1 } from "../diagnostics/gamectl-diagnostics";

const REGISTRY_SCHEMA_VERSION: ScenarioCapabilityRegistryV1["schemaVersion"] =
  "scenario-capability-registry-v1";
const RESOLVED_SCHEMA_VERSION: ScenarioResolvedCapabilitiesV1["schemaVersion"] =
  "scenario-resolved-capabilities-v1";
const RULES_FINGERPRINT_NAMESPACE = "scenario-rules-v1";
const IDENTIFIER = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const RANDOM_CONTENT_RNG_BUDGET_PER_INSTRUCTION = 1;

export type ScenarioCapabilityResolutionPrimitives = Readonly<{
  fingerprint(namespace: string, value: unknown): Fingerprint;
}>;

export type ResolveScenarioCapabilitiesV1Result =
  | Readonly<{ kind: "success"; capabilities: ScenarioResolvedCapabilitiesV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly StructuredDiagnosticV1[] }>;

export function resolveScenarioCapabilitiesV1(
  program: ScenarioProgramV1,
  registry: ScenarioCapabilityRegistryV1,
  primitives: ScenarioCapabilityResolutionPrimitives,
): ResolveScenarioCapabilitiesV1Result {
  validatePrimitives(primitives);
  validateRegistry(registry);

  const providersById = indexProviders(registry.providers);
  const predicatesById = indexPredicates(registry.predicates);
  const diagnostics: StructuredDiagnosticV1[] = [];

  program.providerTable.forEach((providerId, index) => {
    if (providersById.has(providerId)) return;
    diagnostics.push(
      diagnostic(
        program,
        "SCN006",
        `Scenario provider ${JSON.stringify(providerId)} is not registered`,
        `/providerTable/${index}`,
      ),
    );
  });

  program.predicateTable.forEach((predicateId, index) => {
    if (predicatesById.has(predicateId)) return;
    diagnostics.push(
      diagnostic(
        program,
        "SCN007",
        `Scenario predicate ${JSON.stringify(predicateId)} is not registered`,
        `/predicateTable/${index}`,
      ),
    );
  });

  if (diagnostics.length > 0) {
    return { kind: "failure", diagnostics: diagnostics.toSorted(compareDiagnostic) };
  }

  const providers = program.providerTable.map((providerId) => requireProvider(providersById, providerId));
  const predicates = program.predicateTable.map((predicateId) =>
    requirePredicate(predicatesById, predicateId),
  );
  const body = {
    schemaVersion: RESOLVED_SCHEMA_VERSION,
    programFingerprint: program.programFingerprint,
    providers,
    predicates,
    randomContentRngBudgetPerInstruction: RANDOM_CONTENT_RNG_BUDGET_PER_INSTRUCTION,
  } as const;

  return {
    kind: "success",
    capabilities: Object.freeze({
      ...body,
      rulesFingerprint: primitives.fingerprint(RULES_FINGERPRINT_NAMESPACE, body),
    }),
  };
}

function validatePrimitives(primitives: ScenarioCapabilityResolutionPrimitives): void {
  if (typeof primitives.fingerprint !== "function") {
    throw new TypeError("Scenario capability resolution requires a fingerprint primitive");
  }
}

function validateRegistry(registry: ScenarioCapabilityRegistryV1): void {
  if (registry.schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    throw new TypeError("Unsupported scenario capability registry schema");
  }
  for (const descriptor of registry.providers) validateProviderDescriptor(descriptor);
  for (const descriptor of registry.predicates) validatePredicateDescriptor(descriptor);
}

function validateProviderDescriptor(descriptor: ScenarioProviderDescriptorV1): void {
  validateDescriptorIdentity(descriptor.id, descriptor.version, "provider");
  if (descriptor.deterministic !== true) {
    throw new TypeError("Scenario provider descriptors must be deterministic");
  }
  if (!Number.isSafeInteger(descriptor.rngBudgetMax) || descriptor.rngBudgetMax < 0) {
    throw new TypeError("Scenario provider RNG budget must be a non-negative safe integer");
  }
}

function validatePredicateDescriptor(descriptor: ScenarioPredicateDescriptorV1): void {
  validateDescriptorIdentity(descriptor.id, descriptor.version, "predicate");
  if (descriptor.deterministic !== true || descriptor.readOnly !== true) {
    throw new TypeError("Scenario predicate descriptors must be deterministic and read-only");
  }
}

function validateDescriptorIdentity(id: string, version: number, subject: string): void {
  if (!IDENTIFIER.test(id) || id.length > 160) {
    throw new TypeError(`Scenario ${subject} descriptor id is invalid`);
  }
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new TypeError(`Scenario ${subject} descriptor version must be a positive safe integer`);
  }
}

function indexProviders(
  descriptors: readonly ScenarioProviderDescriptorV1[],
): ReadonlyMap<string, ScenarioProviderDescriptorV1> {
  const result = new Map<string, ScenarioProviderDescriptorV1>();
  for (const descriptor of descriptors) {
    if (result.has(descriptor.id)) {
      throw new TypeError(`Duplicate scenario provider descriptor: ${descriptor.id}`);
    }
    result.set(descriptor.id, descriptor);
  }
  return result;
}

function indexPredicates(
  descriptors: readonly ScenarioPredicateDescriptorV1[],
): ReadonlyMap<string, ScenarioPredicateDescriptorV1> {
  const result = new Map<string, ScenarioPredicateDescriptorV1>();
  for (const descriptor of descriptors) {
    if (result.has(descriptor.id)) {
      throw new TypeError(`Duplicate scenario predicate descriptor: ${descriptor.id}`);
    }
    result.set(descriptor.id, descriptor);
  }
  return result;
}

function requireProvider(
  providersById: ReadonlyMap<string, ScenarioProviderDescriptorV1>,
  id: string,
): ScenarioProviderDescriptorV1 {
  const descriptor = providersById.get(id);
  if (descriptor === undefined) throw new TypeError(`Unresolved scenario provider: ${id}`);
  return descriptor;
}

function requirePredicate(
  predicatesById: ReadonlyMap<string, ScenarioPredicateDescriptorV1>,
  id: string,
): ScenarioPredicateDescriptorV1 {
  const descriptor = predicatesById.get(id);
  if (descriptor === undefined) throw new TypeError(`Unresolved scenario predicate: ${id}`);
  return descriptor;
}

function diagnostic(
  program: ScenarioProgramV1,
  code: string,
  message: string,
  pointer: string,
): StructuredDiagnosticV1 {
  return {
    schemaVersion: "runtime-human-diagnostic-v1",
    code,
    severity: "error",
    category: "scenario",
    entityId: program.scenarioId,
    pointer,
    message,
  };
}

function compareDiagnostic(left: StructuredDiagnosticV1, right: StructuredDiagnosticV1): number {
  return compareText(left.code, right.code) || compareText(left.pointer ?? "", right.pointer ?? "");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
