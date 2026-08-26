export const TASK_ENVELOPE_SCHEMA: "runtime-human-task-envelope-v1";

export const RISK_RANK: Readonly<Record<string, number>>;

export interface StudioZoneConfig {
  readonly id: string;
  readonly paths: readonly string[];
  readonly minimumRisk: string;
  readonly preferredProfile?: string;
  readonly promoteToR3On?: readonly string[];
  readonly ownerReview?: boolean;
}

export interface ZoneSelection {
  readonly id: string;
  readonly matched: readonly string[];
}

export interface ZoneResolution {
  readonly selected: readonly ZoneSelection[];
  readonly unmatched: readonly string[];
  readonly ignored: readonly string[];
}

export interface SkillMapEntry {
  readonly name: string;
  readonly status: string;
}

export interface RiskClassification {
  readonly risk: string;
  readonly baseRisk: string;
  readonly promoted: boolean;
}

export interface ReadLists {
  readonly mustRead: readonly string[];
  readonly mayRead: readonly string[];
}

export interface LedgerFindingRow {
  readonly id: string;
  readonly zone: string;
  readonly severity: string;
  readonly category: string;
  readonly component?: string | null;
  readonly invariant?: string | null;
  readonly summary: string;
  readonly disposition: string;
  readonly status: string;
  readonly occurrences?: number;
}

export interface RelevantFinding {
  readonly id: string;
  readonly severity: string;
  readonly zone: string;
  readonly category: string;
  readonly component: string | null;
  readonly invariant: string | null;
  readonly occurrences: number;
  readonly summary: string;
  readonly relevanceScore: number;
}

export interface VerificationPlan {
  readonly tier: string;
  readonly commands: readonly string[];
  readonly notes: readonly string[];
}

export function isValidTier(tier: string): boolean;

export function isValidRisk(risk: string): boolean;

export function toPosix(value: string): string;

export function matchGlob(pattern: string, candidatePath: string): boolean;

export function isIgnoredPath(candidatePath: string, extraNeverLoad?: readonly string[]): boolean;

export function resolveZones(
  changedPaths: readonly string[],
  zones: readonly StudioZoneConfig[],
  options?: { fallbackZone?: string | null; neverBulkLoad?: readonly string[] },
): ZoneResolution;

export function classifyRisk(
  zoneIds: readonly string[],
  zones: readonly StudioZoneConfig[],
  options?: {
    taskText?: string;
    changedPaths?: readonly string[];
    overrideRisk?: string | null;
  },
): RiskClassification;

export function selectSkills(
  zoneIds: readonly string[],
  risk: string,
  skillMapEntries: readonly SkillMapEntry[],
): readonly string[];

export function buildReadLists(options: {
  base: readonly string[];
  guides: readonly string[];
  changedExisting: readonly string[];
  policy: { maxInitialDocs: number; maxInitialFiles: number };
}): ReadLists;

export function selectRelevantFindings(
  rows: readonly LedgerFindingRow[],
  context: { zoneIds: readonly string[]; changedPaths?: readonly string[]; taskText?: string },
  limit?: number,
): readonly RelevantFinding[];

export function deriveVerification(
  zoneIds: readonly string[],
  changedPaths: readonly string[],
  tier: string,
): VerificationPlan;
