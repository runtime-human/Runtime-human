#!/usr/bin/env node

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import {
  EXPECTED_REPOSITORY,
  REMOTE_ADMISSION_SCHEMA,
  admitRemoteCommand,
  buildRemoteResult,
  executeRemoteCommand,
  parseRemoteCommand,
  renderRemoteSummary,
  serializeRemoteResult,
} from "./remote-command-lib.mjs";

const API_VERSION = "2026-03-10";

function ensureParent(filePath) {
  mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function writeText(filePath, content) {
  ensureParent(filePath);
  writeFileSync(filePath, content, "utf8");
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeResult(filePath, summaryPath, result) {
  writeText(filePath, serializeRemoteResult(result));
  writeText(summaryPath, renderRemoteSummary(result));
}

function output(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const safe = String(value ?? "").replace(/[\r\n]/gu, "");
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${safe}\n`, "utf8");
}

function emitAdmissionOutputs(admission) {
  output("admitted", admission.status === "admitted" ? "true" : "false");
  output(
    "needs_target",
    admission.status === "admitted" && admission.command !== "help" ? "true" : "false",
  );
  output("command", admission.command ?? "unknown");
  output("pr_number", admission.prNumber ?? "");
  output("base_sha", admission.baseSha ?? "");
  output("head_sha", admission.headSha ?? "");
}

function failureAdmission(event, parsed, code, message) {
  return {
    schemaVersion: REMOTE_ADMISSION_SCHEMA,
    status: "error",
    command: parsed?.ok ? parsed.command : "unknown",
    prNumber: Number.isInteger(event?.issue?.number) ? event.issue.number : null,
    requestedBy: typeof event?.comment?.user?.login === "string" ? event.comment.user.login : null,
    baseSha: null,
    headSha: null,
    error: { code, message },
  };
}

function githubRequestOptions(token) {
  return {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "runtime-human-remote-control",
    },
  };
}

async function githubJson(endpoint, token, request = fetch) {
  const response = await request(`https://api.github.com${endpoint}`, githubRequestOptions(token));
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${endpoint}`);
  return response.json();
}

export async function fetchRepositoryPermission(username, token, request = fetch) {
  const endpoint = `/repos/runtime-human/Runtime-human/collaborators/${encodeURIComponent(username)}/permission`;
  const response = await request(`https://api.github.com${endpoint}`, githubRequestOptions(token));
  if (response.status === 404) return { permission: "none", role_name: "none" };
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${endpoint}`);
  return response.json();
}

function commonResultInput(admission) {
  return {
    admission,
    controlSha: process.env.GITHUB_SHA ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
  };
}

async function admit(options) {
  const event = JSON.parse(readFileSync(options.event, "utf8"));
  const parsed = parseRemoteCommand(event?.comment?.body);
  let admission;

  try {
    const needsApi =
      event?.action === "created" &&
      event?.repository?.full_name === EXPECTED_REPOSITORY &&
      Boolean(event?.issue?.pull_request) &&
      parsed.ok;

    if (!needsApi) {
      admission = admitRemoteCommand({
        event,
        pullRequest: null,
        permission: null,
        expectedRepository: EXPECTED_REPOSITORY,
      });
    } else {
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw new Error("GITHUB_TOKEN is required for remote admission");
      const prNumber = event.issue.number;
      const requestedBy = event.comment.user.login;
      const pullRequest = await githubJson(
        `/repos/runtime-human/Runtime-human/pulls/${prNumber}`,
        token,
      );
      const permission = await fetchRepositoryPermission(requestedBy, token);
      admission = admitRemoteCommand({
        event,
        pullRequest,
        permission,
        expectedRepository: EXPECTED_REPOSITORY,
      });
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    admission = failureAdmission(event, parsed, "admission-api-failure", message);
  }

  writeJson(options.admissionOutput, admission);
  emitAdmissionOutputs(admission);

  if (admission.status === "admitted") return 0;

  const status = admission.status === "rejected" ? "rejected" : "failure";
  const result = buildRemoteResult({
    ...commonResultInput(admission),
    status,
    error: admission.error,
  });
  writeResult(options.resultOutput, options.summaryOutput, result);
  return status === "rejected" ? 0 : 1;
}

function execute(options) {
  const admission = JSON.parse(readFileSync(options.admission, "utf8"));
  let result;
  try {
    const payload = executeRemoteCommand({
      admission,
      targetRoot: path.resolve(options.target),
    });
    result = buildRemoteResult({
      ...commonResultInput(admission),
      status: "success",
      payload,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    result = buildRemoteResult({
      ...commonResultInput(admission),
      status: "failure",
      error: { code: "execution-failure", message },
    });
  }

  writeResult(options.resultOutput, options.summaryOutput, result);
  return result.status === "success" ? 0 : 1;
}

function parseCli(argv) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      event: { type: "string" },
      "admission-output": { type: "string" },
      admission: { type: "string" },
      target: { type: "string" },
      "result-output": { type: "string" },
      "summary-output": { type: "string" },
    },
  });
  const command = positionals[0];
  if (positionals.length !== 1 || !["admit", "execute"].includes(command)) {
    throw new Error("usage: remote-command.mjs <admit|execute> [options]");
  }
  if (!values["result-output"] || !values["summary-output"]) {
    throw new Error("--result-output and --summary-output are required");
  }
  if (command === "admit" && (!values.event || !values["admission-output"])) {
    throw new Error("admit requires --event and --admission-output");
  }
  if (command === "execute" && (!values.admission || !values.target)) {
    throw new Error("execute requires --admission and --target");
  }
  return {
    command,
    options: {
      event: values.event,
      admissionOutput: values["admission-output"],
      admission: values.admission,
      target: values.target,
      resultOutput: values["result-output"],
      summaryOutput: values["summary-output"],
    },
  };
}

export async function runRemoteCommandCli(argv) {
  const { command, options } = parseCli(argv);
  return command === "admit" ? admit(options) : execute(options);
}

async function main() {
  try {
    process.exitCode = await runRemoteCommandCli(process.argv.slice(2));
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : String(cause));
    process.exitCode = 2;
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) await main();
