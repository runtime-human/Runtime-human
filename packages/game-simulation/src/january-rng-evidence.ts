import { JANUARY_1990_RNG_CALL_BUDGET } from "@runtime-human/game-core";
import {
  RNG_DERIVATION_MANIFEST_V1,
  type Fingerprint,
  type RngDerivationManifestV1,
} from "@runtime-human/game-schema";

import { JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION } from "./january-rng-shadow";

export const JANUARY_RNG_EVIDENCE_SCHEMA_VERSION = "january-rng-evidence-v1" as const;

export type JanuaryRngEvidenceV1 = Readonly<{
  schemaVersion: typeof JANUARY_RNG_EVIDENCE_SCHEMA_VERSION;
  authority: Readonly<{ mode: "legacy-sequential-v1" }>;
  shadow: Readonly<{
    mode: "hierarchical-v1";
    derivationManifest: RngDerivationManifestV1;
    reportSchemaVersion: typeof JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION;
    declaredCallBudget: Readonly<{
      content: number;
      narrative: number;
      outcome: number;
    }>;
    goldenReportFingerprint: Fingerprint;
  }>;
}>;

export type JanuaryRngEvidenceParseResultV1 =
  | Readonly<{ kind: "ok"; evidence: JanuaryRngEvidenceV1 }>
  | Readonly<{ kind: "invalid"; message: string }>;

const JANUARY_RNG_SHADOW_GOLDEN_REPORT_FINGERPRINT =
  "f013a1155f4829ba20a112b12e1edb906288ecc27468808c1fb87d0b45ab15bd" as Fingerprint;

export const JANUARY_RNG_EVIDENCE_V1: JanuaryRngEvidenceV1 = Object.freeze({
  schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION,
  authority: Object.freeze({ mode: "legacy-sequential-v1" }),
  shadow: Object.freeze({
    mode: "hierarchical-v1",
    derivationManifest: RNG_DERIVATION_MANIFEST_V1,
    reportSchemaVersion: JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION,
    declaredCallBudget: Object.freeze({ ...JANUARY_1990_RNG_CALL_BUDGET }),
    goldenReportFingerprint: JANUARY_RNG_SHADOW_GOLDEN_REPORT_FINGERPRINT,
  }),
});

export function parseJanuaryRngEvidenceV1(value: unknown): JanuaryRngEvidenceParseResultV1 {
  const evidence = closedRecord(value, ["authority", "schemaVersion", "shadow"]);
  if (evidence === null) return invalid("RNG evidence must match the closed v1 field set");
  if (evidence.schemaVersion !== JANUARY_RNG_EVIDENCE_SCHEMA_VERSION) {
    return invalid(`RNG evidence schemaVersion must be ${JANUARY_RNG_EVIDENCE_SCHEMA_VERSION}`);
  }

  const authority = closedRecord(evidence.authority, ["mode"]);
  if (authority?.mode !== "legacy-sequential-v1") {
    return invalid("RNG evidence authority mode must be legacy-sequential-v1");
  }

  const shadow = closedRecord(evidence.shadow, [
    "declaredCallBudget",
    "derivationManifest",
    "goldenReportFingerprint",
    "mode",
    "reportSchemaVersion",
  ]);
  if (shadow === null || shadow.mode !== "hierarchical-v1") {
    return invalid("RNG evidence shadow must match the closed hierarchical-v1 shape");
  }
  if (shadow.reportSchemaVersion !== JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION) {
    return invalid(
      `RNG evidence shadow report schema must be ${JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION}`,
    );
  }
  if (!isFingerprint(shadow.goldenReportFingerprint)) {
    return invalid("RNG evidence shadow goldenReportFingerprint must be a 64-hex fingerprint");
  }

  const manifest = closedRecord(shadow.derivationManifest, [
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

  const budget = closedRecord(shadow.declaredCallBudget, ["content", "narrative", "outcome"]);
  if (
    budget === null ||
    !isNonNegativeSafeInteger(budget.content) ||
    !isNonNegativeSafeInteger(budget.narrative) ||
    !isNonNegativeSafeInteger(budget.outcome)
  ) {
    return invalid("RNG evidence declared call budget must contain non-negative safe integers");
  }

  return {
    kind: "ok",
    evidence: Object.freeze({
      schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION,
      authority: Object.freeze({ mode: "legacy-sequential-v1" }),
      shadow: Object.freeze({
        mode: "hierarchical-v1",
        derivationManifest: RNG_DERIVATION_MANIFEST_V1,
        reportSchemaVersion: JANUARY_RNG_SHADOW_REPORT_SCHEMA_VERSION,
        declaredCallBudget: Object.freeze({
          content: budget.content,
          narrative: budget.narrative,
          outcome: budget.outcome,
        }),
        goldenReportFingerprint: shadow.goldenReportFingerprint,
      }),
    }),
  };
}

export function januaryRngEvidenceEqual(
  left: JanuaryRngEvidenceV1,
  right: JanuaryRngEvidenceV1,
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.authority.mode === right.authority.mode &&
    left.shadow.mode === right.shadow.mode &&
    left.shadow.derivationManifest.algorithm === right.shadow.derivationManifest.algorithm &&
    left.shadow.derivationManifest.derivationVersion ===
      right.shadow.derivationManifest.derivationVersion &&
    left.shadow.derivationManifest.hashAlgorithm ===
      right.shadow.derivationManifest.hashAlgorithm &&
    left.shadow.derivationManifest.serializationVersion ===
      right.shadow.derivationManifest.serializationVersion &&
    left.shadow.reportSchemaVersion === right.shadow.reportSchemaVersion &&
    left.shadow.declaredCallBudget.content === right.shadow.declaredCallBudget.content &&
    left.shadow.declaredCallBudget.narrative === right.shadow.declaredCallBudget.narrative &&
    left.shadow.declaredCallBudget.outcome === right.shadow.declaredCallBudget.outcome &&
    left.shadow.goldenReportFingerprint === right.shadow.goldenReportFingerprint
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

function isFingerprint(value: unknown): value is Fingerprint {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function invalid(message: string): JanuaryRngEvidenceParseResultV1 {
  return { kind: "invalid", message };
}
