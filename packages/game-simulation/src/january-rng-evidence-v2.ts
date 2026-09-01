import { JANUARY_1990_RNG_CALL_BUDGET } from "@runtime-human/game-core";
import {
  RNG_DERIVATION_MANIFEST_V1,
  type RngDerivationManifestV1,
} from "@runtime-human/game-schema";

export const JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2 = "january-rng-evidence-v2" as const;

export type JanuaryRngEvidenceV2 = Readonly<{
  schemaVersion: typeof JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2;
  rngDerivationVersion: "hierarchical-v1";
  authority: Readonly<{
    mode: "hierarchical-v1";
    derivationManifest: RngDerivationManifestV1;
    declaredCallBudget: Readonly<{
      content: number;
      narrative: number;
      outcome: number;
    }>;
  }>;
}>;

export type JanuaryRngEvidenceParseResultV2 =
  | Readonly<{ kind: "ok"; evidence: JanuaryRngEvidenceV2 }>
  | Readonly<{ kind: "invalid"; message: string }>;

export const JANUARY_RNG_EVIDENCE_V2: JanuaryRngEvidenceV2 = Object.freeze({
  schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2,
  rngDerivationVersion: "hierarchical-v1",
  authority: Object.freeze({
    mode: "hierarchical-v1",
    derivationManifest: RNG_DERIVATION_MANIFEST_V1,
    declaredCallBudget: Object.freeze({ ...JANUARY_1990_RNG_CALL_BUDGET }),
  }),
});

export function parseJanuaryRngEvidenceV2(value: unknown): JanuaryRngEvidenceParseResultV2 {
  const evidence = closedRecord(value, ["authority", "rngDerivationVersion", "schemaVersion"]);
  if (evidence === null) return invalid("RNG evidence must match the closed v2 field set");
  if (evidence.schemaVersion !== JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2) {
    return invalid(`RNG evidence schemaVersion must be ${JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2}`);
  }
  if (evidence.rngDerivationVersion !== "hierarchical-v1") {
    return invalid("RNG evidence rngDerivationVersion must be hierarchical-v1");
  }

  const authority = closedRecord(evidence.authority, [
    "declaredCallBudget",
    "derivationManifest",
    "mode",
  ]);
  if (authority === null || authority.mode !== "hierarchical-v1") {
    return invalid("RNG evidence authority must match the closed hierarchical-v1 shape");
  }

  const manifest = closedRecord(authority.derivationManifest, [
    "algorithm",
    "derivationVersion",
    "hashAlgorithm",
    "serializationVersion",
  ]);
  if (
    manifest === null ||
    manifest.algorithm !== RNG_DERIVATION_MANIFEST_V1.algorithm ||
    manifest.derivationVersion !== RNG_DERIVATION_MANIFEST_V1.derivationVersion ||
    manifest.hashAlgorithm !== RNG_DERIVATION_MANIFEST_V1.hashAlgorithm ||
    manifest.serializationVersion !== RNG_DERIVATION_MANIFEST_V1.serializationVersion
  ) {
    return invalid("RNG evidence derivation manifest is not hierarchical-v1");
  }

  const budget = closedRecord(authority.declaredCallBudget, ["content", "narrative", "outcome"]);
  if (
    budget === null ||
    budget.content !== JANUARY_1990_RNG_CALL_BUDGET.content ||
    budget.narrative !== JANUARY_1990_RNG_CALL_BUDGET.narrative ||
    budget.outcome !== JANUARY_1990_RNG_CALL_BUDGET.outcome
  ) {
    return invalid(
      "RNG evidence declared call budget does not match the January authority contract",
    );
  }

  return {
    kind: "ok",
    evidence: Object.freeze({
      schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2,
      rngDerivationVersion: "hierarchical-v1",
      authority: Object.freeze({
        mode: "hierarchical-v1",
        derivationManifest: RNG_DERIVATION_MANIFEST_V1,
        declaredCallBudget: Object.freeze({
          content: JANUARY_1990_RNG_CALL_BUDGET.content,
          narrative: JANUARY_1990_RNG_CALL_BUDGET.narrative,
          outcome: JANUARY_1990_RNG_CALL_BUDGET.outcome,
        }),
      }),
    }),
  };
}

export function januaryRngEvidenceV2Equal(
  left: JanuaryRngEvidenceV2,
  right: JanuaryRngEvidenceV2,
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.rngDerivationVersion === right.rngDerivationVersion &&
    left.authority.mode === right.authority.mode &&
    left.authority.derivationManifest.algorithm === right.authority.derivationManifest.algorithm &&
    left.authority.derivationManifest.derivationVersion ===
      right.authority.derivationManifest.derivationVersion &&
    left.authority.derivationManifest.hashAlgorithm ===
      right.authority.derivationManifest.hashAlgorithm &&
    left.authority.derivationManifest.serializationVersion ===
      right.authority.derivationManifest.serializationVersion &&
    left.authority.declaredCallBudget.content === right.authority.declaredCallBudget.content &&
    left.authority.declaredCallBudget.narrative === right.authority.declaredCallBudget.narrative &&
    left.authority.declaredCallBudget.outcome === right.authority.declaredCallBudget.outcome
  );
}

function closedRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isPlainRecord(value)) return null;
  const actualKeys = Object.keys(value);
  if (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key))) {
    return null;
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function invalid(message: string): JanuaryRngEvidenceParseResultV2 {
  return { kind: "invalid", message };
}
