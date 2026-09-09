import type { ChangeInspection } from "./control-plane-lib.mjs";

export const PR_EVIDENCE_SCHEMA: "runtime-human-pr-evidence-v1";
export const SIMULATION_REGRESSION_EVIDENCE_SCHEMA: "runtime-human-simulation-regression-evidence-v1";

export type PrEvidenceStatus = "success" | "failure";

export type SimulationRegressionEvidenceV1 =
  | Readonly<{
      schemaVersion: typeof SIMULATION_REGRESSION_EVIDENCE_SCHEMA;
      status: "complete";
      baseSha: string;
      headSha: string;
      testedSha: string;
      artifact: Readonly<{ name: string; diffPath: "diff.json" }>;
      corpus: Readonly<{
        schemaVersion: "simulation-corpus-v1";
        corpusId: string;
        fingerprint: string;
      }>;
      verdict: "pass" | "pass-with-changes" | "fail";
      changes: Readonly<{
        hardInvariants: number;
        metrics: number;
        distributions: number;
        fingerprints: number;
      }>;
    }>
  | Readonly<{
      schemaVersion: typeof SIMULATION_REGRESSION_EVIDENCE_SCHEMA;
      status: "unavailable";
      baseSha: string;
      headSha: string;
      testedSha: string;
      artifact: Readonly<{ name: string }>;
      reason: "simulation-diff-unavailable";
    }>;

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
  simulationRegression?: SimulationRegressionEvidenceV1 | undefined;
}>;

export function buildPrEvidence(
  input: Readonly<{
    inspection: ChangeInspection | unknown;
    testedSha: string;
    status: PrEvidenceStatus | string;
    exitCode: number;
    simulationRegression?: SimulationRegressionEvidenceV1 | undefined;
  }>,
): PrEvidenceV1;

export function collectPrEvidence(
  root: string,
  input: Readonly<{
    base: string;
    head: string;
    tested: string;
    status: PrEvidenceStatus | string;
    exitCode: number;
    simulationEvidenceDir?: string | undefined;
    simulationArtifactName?: string | undefined;
  }>,
): PrEvidenceV1;

export function serializePrEvidence(value: PrEvidenceV1): string;
export function renderPrEvidenceSummary(value: PrEvidenceV1): string;
