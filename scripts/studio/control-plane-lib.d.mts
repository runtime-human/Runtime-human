export const STUDIO_CAPABILITIES_SCHEMA: "runtime-human-studio-capabilities-v1";
export const CHANGE_INSPECTION_SCHEMA: "runtime-human-change-inspection-v1";
export const PR_EVIDENCE_SCHEMA: "runtime-human-pr-evidence-v1";

export type StudioCapabilities = Readonly<{
  schemaVersion: typeof STUDIO_CAPABILITIES_SCHEMA;
  commands: Readonly<{ capabilities: 1; inspect: 1; evidence: 1 }>;
  contracts: Readonly<{
    inspection: typeof CHANGE_INSPECTION_SCHEMA;
    taskEnvelope: "runtime-human-task-envelope-v1";
    evidence: typeof PR_EVIDENCE_SCHEMA;
  }>;
  verification: Readonly<{ v3: "pnpm verify"; v4: "pnpm verify:release" }>;
}>;

export type ChangeInspection = Readonly<{
  schemaVersion: typeof CHANGE_INSPECTION_SCHEMA;
  baseSha: string;
  headSha: string;
  changedPaths: string[];
  zones: string[];
  primaryZone: string | null;
  risk: "R1" | "R2" | "R2_COMPLEX" | "R3";
  authorityImpact: Readonly<{
    canon: boolean;
    gameplay: boolean;
    persistence: boolean;
    schema: boolean;
    security: boolean;
    ciGovernance: boolean;
  }>;
  skills: string[];
  mustRead: string[];
  mayRead: string[];
  allowedWrite: string[];
  relevantFindings: ReadonlyArray<Readonly<{ id: string; [key: string]: unknown }>>;
  verification: Readonly<{
    requiredTier: "V1" | "V2";
    commands: string[][] | null;
    notes: string[];
    v3Recommended: boolean;
  }>;
  unmatchedPaths: string[];
  ignoredPaths: string[];
}>;

export function resolveCommit(root: string, ref: string): string;
export function buildStudioCapabilities(): StudioCapabilities;
export function inspectChange(
  root: string,
  refs: Readonly<{ base: string; head: string }>,
): ChangeInspection;
