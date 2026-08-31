import { describe, expect, it } from "vitest";

const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);
const CONTROL_SHA = "3".repeat(40);
const moduleUrl = new URL("../scripts/studio/remote-command-lib.mjs", import.meta.url).href;

function admitted(command: "help" | "studio-capabilities" | "inspect" | "game-capabilities") {
  return {
    schemaVersion: "runtime-human-remote-admission-v1",
    status: "admitted",
    command,
    prNumber: 101,
    requestedBy: "maintainer",
    baseSha: BASE_SHA,
    headSha: HEAD_SHA,
    error: null,
  } as const;
}

describe("runtime-human-remote-result-v1", () => {
  it("does not claim a target SHA for help because help never executes the PR checkout", async () => {
    const remote = await import(moduleUrl);

    const result = remote.buildRemoteResult({
      admission: admitted("help"),
      status: "success",
      payload: remote.helpPayload(),
      controlSha: CONTROL_SHA,
      runId: "12345",
    });

    expect(result).toMatchObject({
      schemaVersion: "runtime-human-remote-result-v1",
      command: "help",
      headSha: HEAD_SHA,
      targetSha: null,
      controlSha: CONTROL_SHA,
      status: "success",
    });
  });

  it("serializes typed rejection results deterministically", async () => {
    const remote = await import(moduleUrl);
    const admission = {
      schemaVersion: "runtime-human-remote-admission-v1",
      status: "rejected",
      command: "unknown",
      prNumber: 101,
      requestedBy: "outsider",
      baseSha: null,
      headSha: null,
      error: { code: "insufficient-permission", message: "permission denied" },
    } as const;
    const input = {
      admission,
      status: "rejected" as const,
      error: admission.error,
      controlSha: CONTROL_SHA,
      runId: "12345",
    };

    const first = remote.buildRemoteResult(input);
    const second = remote.buildRemoteResult(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: "runtime-human-remote-result-v1",
      command: "unknown",
      targetSha: null,
      status: "rejected",
      error: { code: "insufficient-permission" },
    });
    expect(remote.serializeRemoteResult(first)).toBe(`${JSON.stringify(first, null, 2)}\n`);
  });

  it("keeps the admitted head as target identity for execution failures", async () => {
    const remote = await import(moduleUrl);
    const error = { code: "execution-failure", message: "target command failed" } as const;

    const result = remote.buildRemoteResult({
      admission: admitted("inspect"),
      status: "failure",
      error,
      controlSha: CONTROL_SHA,
      runId: "12345",
    });

    expect(result).toMatchObject({
      schemaVersion: "runtime-human-remote-result-v1",
      command: "inspect",
      headSha: HEAD_SHA,
      targetSha: HEAD_SHA,
      status: "failure",
      error,
    });
  });
});
