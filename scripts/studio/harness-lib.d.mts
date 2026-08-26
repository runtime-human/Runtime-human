export const AFFECTED_SCHEMA: "runtime-human-affected-v1";
export const VERIFY_SCHEMA: "runtime-human-verify-v1";

export function sanitizeLogName(args: readonly string[]): string;

export interface OutputSummary {
  readonly total: number | null;
  readonly failed: number | null;
  readonly excerpts: readonly string[];
}

export function summarizeText(
  text: string,
  options?: { maxFailures?: number; maxLines?: number },
): OutputSummary;

export function formatCompact(options: {
  status: "PASS" | "FAIL";
  name: string;
  detail?: string;
  excerpts?: readonly string[];
  logPath: string;
}): readonly string[];

export interface CommandRunResult {
  readonly code: number;
  readonly durationMs: number;
  readonly logPath: string;
  readonly passed: boolean;
  readonly output: string;
  readonly spawnError?: boolean;
}

export function runProcess(
  args: readonly string[],
  options?: {
    cwd?: string;
    encoding?: string;
    maxBuffer?: number;
    env?: NodeJS.ProcessEnv;
  },
): {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

export function runCommand(options: {
  args: readonly string[];
  cwd?: string;
  logDir: string;
}): CommandRunResult;

export interface AffectedClassification {
  readonly resolution: {
    readonly selected: readonly { id: string; matched: readonly string[] }[];
    readonly unmatched: readonly string[];
    readonly ignored: readonly string[];
  };
  readonly zoneIds: readonly string[];
  readonly projects: readonly string[];
  readonly tests: readonly string[];
  readonly storybook: boolean;
  readonly rust: boolean;
  readonly contentCompiler: boolean;
  readonly exclusiveConflict: boolean;
}

export function classifyAffected(
  changedPaths: readonly string[],
  zonesConfig: unknown,
  contextMapPolicy?: { neverBulkLoad?: readonly string[] },
): AffectedClassification;

export function shouldRecommendFullGate(options: {
  risk: string;
  exclusiveConflict: boolean;
  selectedZoneCount: number;
}): boolean;

export function mergeProjectLists(
  primary: readonly string[],
  secondary: readonly string[],
): readonly string[];

export function buildTierCommands(
  tier: string,
  affected: AffectedClassification & { risk?: string },
): { commands: readonly (readonly string[])[] | null; notes: readonly string[] };
