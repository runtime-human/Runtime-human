import { spawnSync } from "node:child_process";

export const REMOTE_ADMISSION_SCHEMA = "runtime-human-remote-admission-v1";
export const REMOTE_RESULT_SCHEMA = "runtime-human-remote-result-v1";
export const EXPECTED_REPOSITORY = "runtime-human/Runtime-human";

const MAX_COMMAND_LENGTH = 256;
const FULL_SHA = /^[0-9a-f]{40}$/u;
const COMMANDS = new Map([
  ["/rh help", "help"],
  ["/rh capabilities", "studio-capabilities"],
  ["/rh inspect", "inspect"],
  ["/rh game capabilities", "game-capabilities"],
]);

function error(code, message) {
  return { code, message };
}

function rejected(event, parsed, code, message) {
  return {
    schemaVersion: REMOTE_ADMISSION_SCHEMA,
    status: "rejected",
    command: parsed?.ok ? parsed.command : "unknown",
    prNumber: Number.isInteger(event?.issue?.number) ? event.issue.number : null,
    requestedBy: typeof event?.comment?.user?.login === "string" ? event.comment.user.login : null,
    baseSha: null,
    headSha: null,
    error: error(code, message),
  };
}

export function parseRemoteCommand(body) {
  if (typeof body !== "string") {
    return { ok: false, error: error("invalid-command", "comment body must be text") };
  }
  if (body.length > MAX_COMMAND_LENGTH) {
    return {
      ok: false,
      error: error("command-too-long", `command exceeds ${MAX_COMMAND_LENGTH} characters`),
    };
  }

  const normalized = body.trim().replace(/\s+/gu, " ");
  const command = COMMANDS.get(normalized);
  if (!command) {
    return {
      ok: false,
      normalized,
      error: error("unsupported-command", "unsupported /rh command"),
    };
  }
  return { ok: true, normalized, command };
}

function normalizeSha(value) {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return FULL_SHA.test(normalized) ? normalized : null;
}

function hasWriteEquivalentPermission(permission) {
  const base = String(permission?.permission ?? "").toLowerCase();
  const role = String(permission?.role_name ?? "").toLowerCase();
  return base === "write" || base === "admin" || ["write", "maintain", "admin"].includes(role);
}

export function admitRemoteCommand({
  event,
  pullRequest,
  permission,
  expectedRepository = EXPECTED_REPOSITORY,
}) {
  const parsed = parseRemoteCommand(event?.comment?.body);

  if (event?.action !== "created") {
    return rejected(
      event,
      parsed,
      "unsupported-event-action",
      "only issue_comment.created is admitted",
    );
  }
  if (event?.repository?.full_name !== expectedRepository) {
    return rejected(
      event,
      parsed,
      "repository-mismatch",
      "event repository is not the configured repository",
    );
  }
  if (!event?.issue?.pull_request) {
    return rejected(
      event,
      parsed,
      "not-pull-request",
      "remote commands are accepted only on pull requests",
    );
  }
  if (!parsed.ok) {
    return rejected(event, parsed, parsed.error.code, parsed.error.message);
  }
  if (!pullRequest || pullRequest.number !== event.issue.number) {
    return rejected(
      event,
      parsed,
      "pull-request-mismatch",
      "pull request metadata does not match the event",
    );
  }
  if (pullRequest?.base?.repo?.full_name !== expectedRepository) {
    return rejected(
      event,
      parsed,
      "base-repository-mismatch",
      "pull request base repository is not the configured repository",
    );
  }
  if (pullRequest?.head?.repo?.full_name !== expectedRepository) {
    return rejected(
      event,
      parsed,
      "fork-pull-request",
      "fork pull requests are not admitted for remote execution",
    );
  }
  if (pullRequest?.base?.ref !== "main") {
    return rejected(
      event,
      parsed,
      "unsupported-base",
      "remote command v1 requires base branch main",
    );
  }

  const baseSha = normalizeSha(pullRequest?.base?.sha);
  const headSha = normalizeSha(pullRequest?.head?.sha);
  if (!baseSha || !headSha) {
    return rejected(
      event,
      parsed,
      "invalid-sha",
      "pull request base/head must be full commit SHAs",
    );
  }
  if (!hasWriteEquivalentPermission(permission)) {
    return rejected(
      event,
      parsed,
      "insufficient-permission",
      "remote commands require write, maintain, or admin-equivalent repository permission",
    );
  }

  return {
    schemaVersion: REMOTE_ADMISSION_SCHEMA,
    status: "admitted",
    command: parsed.command,
    prNumber: pullRequest.number,
    requestedBy: event.comment.user.login,
    baseSha,
    headSha,
    error: null,
  };
}

export function buildExecutionPlan(command, { baseSha, headSha }) {
  if (command === "help") return [];
  if (command === "studio-capabilities") {
    return [
      { file: "node", args: ["scripts/studioctl.mjs", "capabilities", "--json"], shell: false },
    ];
  }
  if (command === "inspect") {
    return [
      {
        file: "node",
        args: ["scripts/studioctl.mjs", "inspect", "--base", baseSha, "--head", headSha, "--json"],
        shell: false,
      },
    ];
  }
  if (command === "game-capabilities") {
    return [
      {
        file: "node",
        args: ["scripts/gamectl-capabilities.mjs", "capabilities", "--json"],
        shell: false,
      },
    ];
  }
  throw new Error(`unsupported admitted command: ${command}`);
}

export function buildRemoteResult({
  admission,
  status,
  payload = null,
  error: resultError = null,
  controlSha,
  runId,
}) {
  return {
    schemaVersion: REMOTE_RESULT_SCHEMA,
    command: admission?.command ?? "unknown",
    prNumber: admission?.prNumber ?? null,
    requestedBy: admission?.requestedBy ?? null,
    baseSha: admission?.baseSha ?? null,
    headSha: admission?.headSha ?? null,
    targetSha:
      admission?.status === "admitted" && admission.command !== "help" ? admission.headSha : null,
    controlSha: normalizeSha(controlSha),
    runId: runId == null ? null : String(runId),
    status,
    payload,
    error: resultError,
  };
}

export function serializeRemoteResult(result) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderRemoteSummary(result) {
  const lines = [
    "## Runtime Human remote command",
    "",
    `- status: \`${result.status}\``,
    `- command: \`${result.command}\``,
    `- PR: \`${result.prNumber ?? "n/a"}\``,
    `- requested by: \`${result.requestedBy ?? "n/a"}\``,
    `- head: \`${result.headSha ?? "n/a"}\``,
    `- control: \`${result.controlSha ?? "n/a"}\``,
  ];
  if (result.error) lines.push(`- error: \`${result.error.code}\` — ${result.error.message}`);
  return `${lines.join("\n")}\n`;
}

export function helpPayload() {
  return {
    schemaVersion: "runtime-human-remote-help-v1",
    commands: ["/rh help", "/rh capabilities", "/rh inspect", "/rh game capabilities"],
  };
}

function targetEnvironment(source = process.env) {
  const allowed = [
    "PATH",
    "HOME",
    "USERPROFILE",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "PNPM_HOME",
    "LANG",
    "LC_ALL",
  ];
  const result = { CI: "true" };
  for (const key of allowed) {
    if (typeof source[key] === "string") result[key] = source[key];
  }
  return result;
}

export function executeRemoteCommand({
  admission,
  targetRoot,
  spawn = spawnSync,
  environment = process.env,
}) {
  if (admission?.status !== "admitted") {
    throw new Error("remote execution requires an admitted request");
  }
  if (admission.command === "help") return helpPayload();

  const plan = buildExecutionPlan(admission.command, {
    baseSha: admission.baseSha,
    headSha: admission.headSha,
  });
  let finalStdout = "";
  for (const step of plan) {
    const file = step.file === "node" ? process.execPath : step.file;
    const result = spawn(file, step.args, {
      cwd: targetRoot,
      shell: false,
      encoding: "utf8",
      env: targetEnvironment(environment),
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const stderr = String(result.stderr ?? "")
        .trim()
        .slice(0, 2000);
      throw new Error(`${step.file} exited ${result.status}${stderr ? `: ${stderr}` : ""}`);
    }
    finalStdout = String(result.stdout ?? "").trim();
  }

  if (!finalStdout) throw new Error("remote target command produced no JSON output");
  const payload = JSON.parse(finalStdout);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("remote target command did not return a JSON object");
  }
  return payload;
}
