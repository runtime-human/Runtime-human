import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type RemoteCommandModule = Readonly<{
  parseRemoteCommand: (body: string) => Record<string, unknown>;
  admitRemoteCommand: (input: Record<string, unknown>) => Record<string, unknown>;
  buildExecutionPlan: (
    command: string,
    input: Readonly<{ baseSha: string; headSha: string }>,
  ) => ReadonlyArray<Readonly<{ file: string; args: readonly string[]; shell: boolean }>>;
  buildRemoteResult: (input: Record<string, unknown>) => Record<string, unknown>;
  serializeRemoteResult: (result: Record<string, unknown>) => string;
  executeRemoteCommand: (input: {
    admission: Record<string, unknown>;
    targetRoot: string;
    spawn: (...args: unknown[]) => unknown;
    environment: Record<string, string>;
  }) => unknown;
}>;

type RemoteCommandCliModule = Readonly<{
  fetchRepositoryPermission: (
    username: string,
    token: string,
    request: (
      url: string,
      init: Record<string, unknown>,
    ) => Promise<{
      status: number;
      ok: boolean;
      json: () => Promise<unknown>;
    }>,
  ) => Promise<Record<string, unknown>>;
}>;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = new URL("../scripts/studio/remote-command-lib.mjs", import.meta.url).href;
const cliModuleUrl = new URL("../scripts/studio/remote-command.mjs", import.meta.url).href;
let modulePromise: Promise<RemoteCommandModule> | undefined;
let cliModulePromise: Promise<RemoteCommandCliModule> | undefined;

function loadModule() {
  modulePromise ??= import(moduleUrl) as Promise<RemoteCommandModule>;
  return modulePromise;
}

function loadCliModule() {
  cliModulePromise ??= import(cliModuleUrl) as Promise<RemoteCommandCliModule>;
  return cliModulePromise;
}

const REPOSITORY = "runtime-human/Runtime-human";
const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);

function admittedInput(overrides: Record<string, unknown> = {}) {
  const event = {
    action: "created",
    repository: { full_name: REPOSITORY },
    issue: { number: 101, pull_request: { url: "https://api.github.com/pulls/101" } },
    comment: { body: "/rh inspect", user: { login: "maintainer" } },
  };
  const pullRequest = {
    number: 101,
    base: { ref: "main", sha: BASE_SHA, repo: { full_name: REPOSITORY } },
    head: { sha: HEAD_SHA, repo: { full_name: REPOSITORY } },
  };
  const permission = { permission: "write", role_name: "write" };
  return { event, pullRequest, permission, expectedRepository: REPOSITORY, ...overrides };
}

function admitted(command: string) {
  return {
    schemaVersion: "runtime-human-remote-admission-v1",
    status: "admitted",
    command,
    prNumber: 101,
    requestedBy: "maintainer",
    baseSha: BASE_SHA,
    headSha: HEAD_SHA,
    error: null,
  };
}

describe("remote /rh command contract", () => {
  it("accepts only the four bounded commands after whitespace normalization", async () => {
    const remote = await loadModule();

    expect(remote.parseRemoteCommand("  /rh   help\n")).toMatchObject({
      ok: true,
      command: "help",
    });
    expect(remote.parseRemoteCommand("/rh capabilities")).toMatchObject({
      ok: true,
      command: "studio-capabilities",
    });
    expect(remote.parseRemoteCommand("/rh inspect")).toMatchObject({
      ok: true,
      command: "inspect",
    });
    expect(remote.parseRemoteCommand("/rh game capabilities")).toMatchObject({
      ok: true,
      command: "game-capabilities",
    });

    for (const body of [
      "/rh inspect; rm -rf /",
      "/rh inspect && whoami",
      "/rh game capabilities --root ..",
      "/rh verify v3",
      "/rh inspect\nwhoami",
      `/rh capabilities ${"x".repeat(300)}`,
    ]) {
      expect(remote.parseRemoteCommand(body)).toMatchObject({ ok: false });
    }
  });

  it("rejects untrusted admission cases before target execution", async () => {
    const remote = await loadModule();

    expect(remote.admitRemoteCommand(admittedInput())).toMatchObject({
      schemaVersion: "runtime-human-remote-admission-v1",
      status: "admitted",
      command: "inspect",
      prNumber: 101,
      requestedBy: "maintainer",
      baseSha: BASE_SHA,
      headSha: HEAD_SHA,
    });

    const plainIssue = admittedInput();
    plainIssue.event.issue = { number: 101 } as typeof plainIssue.event.issue;
    expect(remote.admitRemoteCommand(plainIssue)).toMatchObject({
      status: "rejected",
      error: { code: "not-pull-request" },
    });

    const fork = admittedInput();
    fork.pullRequest = {
      ...fork.pullRequest,
      head: { ...fork.pullRequest.head, repo: { full_name: "attacker/fork" } },
    };
    expect(remote.admitRemoteCommand(fork)).toMatchObject({
      status: "rejected",
      error: { code: "fork-pull-request" },
    });

    const readOnly = admittedInput({ permission: { permission: "read", role_name: "read" } });
    expect(remote.admitRemoteCommand(readOnly)).toMatchObject({
      status: "rejected",
      error: { code: "insufficient-permission" },
    });

    const badSha = admittedInput();
    badSha.pullRequest = {
      ...badSha.pullRequest,
      head: { ...badSha.pullRequest.head, sha: "not-a-sha" },
    };
    expect(remote.admitRemoteCommand(badSha)).toMatchObject({
      status: "rejected",
      error: { code: "invalid-sha" },
    });
  });

  it("maps admitted commands only to fixed shell-free argv without target dependency install", async () => {
    const remote = await loadModule();

    expect(
      remote.buildExecutionPlan("studio-capabilities", { baseSha: BASE_SHA, headSha: HEAD_SHA }),
    ).toEqual([
      {
        file: "node",
        args: ["scripts/studioctl.mjs", "capabilities", "--json"],
        shell: false,
      },
    ]);

    expect(remote.buildExecutionPlan("inspect", { baseSha: BASE_SHA, headSha: HEAD_SHA })).toEqual([
      {
        file: "node",
        args: [
          "scripts/studioctl.mjs",
          "inspect",
          "--base",
          BASE_SHA,
          "--head",
          HEAD_SHA,
          "--json",
        ],
        shell: false,
      },
    ]);

    expect(
      remote.buildExecutionPlan("game-capabilities", { baseSha: BASE_SHA, headSha: HEAD_SHA }),
    ).toEqual([
      {
        file: "node",
        args: ["scripts/gamectl-capabilities.mjs", "capabilities", "--json"],
        shell: false,
      },
    ]);
  });

  it("maps a missing collaborator permission record to no access", async () => {
    const cli = await loadCliModule();
    const requests: string[] = [];
    const request = async (url: string) => {
      requests.push(url);
      return {
        status: 404,
        ok: false,
        json: async () => ({ message: "Not Found" }),
      };
    };

    await expect(cli.fetchRepositoryPermission("outsider", "token", request)).resolves.toEqual({
      permission: "none",
      role_name: "none",
    });
    expect(requests).toEqual([
      "https://api.github.com/repos/runtime-human/Runtime-human/collaborators/outsider/permission",
    ]);
  });

  it("preserves non-404 permission lookup failures as infrastructure failures", async () => {
    const cli = await loadCliModule();
    const request = async () => ({
      status: 503,
      ok: false,
      json: async () => ({ message: "Service unavailable" }),
    });

    await expect(cli.fetchRepositoryPermission("maintainer", "token", request)).rejects.toThrow(
      "GitHub API 503",
    );
  });

  it("does not expose GitHub or Actions credentials to target subprocesses", async () => {
    const remote = await loadModule();
    const calls: unknown[][] = [];
    const spawn = (...args: unknown[]) => {
      calls.push(args);
      return {
        status: 0,
        stdout: '{"schemaVersion":"runtime-human-studio-capabilities-v1"}',
        stderr: "",
      };
    };

    remote.executeRemoteCommand({
      admission: admitted("studio-capabilities"),
      targetRoot: "/target",
      spawn,
      environment: {
        PATH: "/bin",
        PNPM_HOME: "/pnpm",
        GITHUB_TOKEN: "secret",
        ACTIONS_RUNTIME_TOKEN: "runtime-secret",
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "oidc-secret",
      },
    });

    expect(calls).toHaveLength(1);
    const [, , options] = calls[0] as [
      unknown,
      unknown,
      { shell: boolean; env: Record<string, string> },
    ];
    expect(options.shell).toBe(false);
    expect(options.env).toMatchObject({ PATH: "/bin", PNPM_HOME: "/pnpm", CI: "true" });
    expect(options.env).not.toHaveProperty("GITHUB_TOKEN");
    expect(options.env).not.toHaveProperty("ACTIONS_RUNTIME_TOKEN");
    expect(options.env).not.toHaveProperty("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  });

  it("serializes deterministic typed remote results", async () => {
    const remote = await loadModule();
    const input = {
      admission: admitted("studio-capabilities"),
      status: "success",
      payload: { schemaVersion: "runtime-human-studio-capabilities-v1" },
      controlSha: "3".repeat(40),
      runId: "12345",
    };
    const first = remote.buildRemoteResult(input);
    const second = remote.buildRemoteResult(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: "runtime-human-remote-result-v1",
      command: "studio-capabilities",
      status: "success",
      prNumber: 101,
      requestedBy: "maintainer",
      baseSha: BASE_SHA,
      headSha: HEAD_SHA,
      targetSha: HEAD_SHA,
      controlSha: "3".repeat(40),
      runId: "12345",
    });
    expect(remote.serializeRemoteResult(first)).toBe(`${JSON.stringify(first, null, 2)}\n`);
  });

  it("keeps the permanent workflow read-only and routes plain-issue rejection through admission", () => {
    const workflow = fs.readFileSync(
      path.join(root, ".github/workflows/remote-command.yml"),
      "utf8",
    );

    expect(workflow).toMatch(/issue_comment:\s*\n\s*types:\s*\[created\]/u);
    expect(workflow).toContain("if: ${{ startsWith(github.event.comment.body, '/rh') }}");
    expect(workflow).not.toContain(
      "github.event.issue.pull_request && startsWith(github.event.comment.body, '/rh')",
    );
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("pull-requests: read");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("runtime-human-remote-result-${{ github.run_id }}");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).not.toContain("workflow_run");
    expect(workflow).not.toContain("secrets.");

    const runBlocks = [
      ...workflow.matchAll(/run:\s*\|([\s\S]*?)(?=\n\s{6,}- name:|\n\s{4,}[a-zA-Z_-]+:|$)/gu),
    ]
      .map((match) => match[1])
      .join("\n");
    expect(runBlocks).not.toContain("github.event.comment.body");
  });
});
