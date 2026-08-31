export const REMOTE_ADMISSION_SCHEMA: "runtime-human-remote-admission-v1";
export const REMOTE_RESULT_SCHEMA: "runtime-human-remote-result-v1";
export const EXPECTED_REPOSITORY: "runtime-human/Runtime-human";

export type RemoteCommand = "help" | "studio-capabilities" | "inspect" | "game-capabilities";

export type RemoteError = Readonly<{ code: string; message: string }>;

export type RemoteAdmission = Readonly<{
  schemaVersion: "runtime-human-remote-admission-v1";
  status: "admitted" | "rejected" | "error";
  command: RemoteCommand | "unknown";
  prNumber: number | null;
  requestedBy: string | null;
  baseSha: string | null;
  headSha: string | null;
  error: RemoteError | null;
}>;

export type RemoteExecutionStep = Readonly<{
  file: "node" | "pnpm";
  args: readonly string[];
  shell: false;
}>;

export type RemoteResult = Readonly<{
  schemaVersion: "runtime-human-remote-result-v1";
  command: RemoteCommand | "unknown";
  prNumber: number | null;
  requestedBy: string | null;
  baseSha: string | null;
  headSha: string | null;
  targetSha: string | null;
  controlSha: string | null;
  runId: string | null;
  status: "success" | "rejected" | "failure";
  payload: unknown;
  error: RemoteError | null;
}>;

export function parseRemoteCommand(
  body: unknown,
): Readonly<{ ok: true; normalized: string; command: RemoteCommand }> | Readonly<{ ok: false; normalized?: string; error: RemoteError }>;

export function admitRemoteCommand(input: Readonly<{
  event: any;
  pullRequest: any;
  permission: any;
  expectedRepository?: string;
}>): RemoteAdmission;

export function buildExecutionPlan(
  command: RemoteCommand,
  input: Readonly<{ baseSha: string; headSha: string }>,
): readonly RemoteExecutionStep[];

export function buildRemoteResult(input: Readonly<{
  admission: RemoteAdmission;
  status: "success" | "rejected" | "failure";
  payload?: unknown;
  error?: RemoteError | null;
  controlSha?: string | null;
  runId?: string | number | null;
}>): RemoteResult;

export function serializeRemoteResult(result: RemoteResult): string;
export function renderRemoteSummary(result: RemoteResult): string;
export function helpPayload(): Readonly<{ schemaVersion: "runtime-human-remote-help-v1"; commands: readonly string[] }>;
export function executeRemoteCommand(input: Readonly<{
  admission: RemoteAdmission;
  targetRoot: string;
  spawn?: (...args: any[]) => any;
  environment?: NodeJS.ProcessEnv;
}>): unknown;
