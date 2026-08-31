import type { ChangeInspection } from "./control-plane-lib.mjs";

export const PR_EVIDENCE_SCHEMA: "runtime-human-pr-evidence-v1";

export type PrEvidenceStatus = "success" | "failure";

export type PrEvidenceV1 = Readonly<{
  schemaVersion: typeof PR_EVIDENCE_SCHEMA;
  baseSha: string;
  headSha: string;
  testedSha: string;
  inspection: ChangeInspection;
  verification: Readonly<{
    tier: "V3";
    authority: "pnpm verify";
    status: PrEvidenceStatus;
    result: Readonly<{
      command: "pnpm verify";
      ok: boolean;
      code: number;
    }>;
  }>;
}>;

export function buildPrEvidence(input: Readonly<{
  inspection: ChangeInspection | unknown;
  testedSha: string;
  status: PrEvidenceStatus | string;
  exitCode: number;
}>): PrEvidenceV1;

export function collectPrEvidence(root: string, input: Readonly<{
  base: string;
  head: string;
  tested: string;
  status: PrEvidenceStatus | string;
  exitCode: number;
}>): PrEvidenceV1;

export function serializePrEvidence(value: PrEvidenceV1): string;
export function renderPrEvidenceSummary(value: PrEvidenceV1): string;
