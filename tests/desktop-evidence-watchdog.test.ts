import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  resolveEvidenceDirectoryForRemoval,
  resolveWindowsTaskkillPath,
  runBoundedCaptureProcess,
  type CaptureProcessPorts,
  type CaptureProcessResult,
} from "../tools/desktop-evidence/src/run-capture-process";

const EVIDENCE_PREFIX = "runtime-human-desktop-evidence-";
const PREPARED_DIRECTORY = join(tmpdir(), `${EVIDENCE_PREFIX}watchdog-test`);

function never(): Promise<void> {
  return new Promise(() => undefined);
}

function successfulChild() {
  return {
    pid: 1234,
    result: Promise.resolve<CaptureProcessResult>({ code: 0, signal: null }),
    killTree: vi.fn(async () => undefined),
  };
}

function ports(overrides: Partial<CaptureProcessPorts> = {}): CaptureProcessPorts {
  return {
    prepareEvidenceDirectory: vi.fn(async () => PREPARED_DIRECTORY),
    launch: vi.fn(successfulChild),
    wait: vi.fn(never),
    removeEvidenceDirectory: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("desktop evidence capture watchdog", () => {
  it("passes one prepared directory to a successful child and cleans exactly that path", async () => {
    const launch = vi.fn(successfulChild);
    const removeEvidenceDirectory = vi.fn(async () => undefined);
    const lifecycle = ports({ launch, removeEvidenceDirectory });

    await expect(
      runBoundedCaptureProcess(["--sample-index=0"], 5_000, lifecycle),
    ).resolves.toBeUndefined();

    expect(launch).toHaveBeenCalledWith(["--sample-index=0"], PREPARED_DIRECTORY);
    const child = launch.mock.results[0]?.value;
    expect(child?.killTree).not.toHaveBeenCalled();
    expect(removeEvidenceDirectory).toHaveBeenCalledOnce();
    expect(removeEvidenceDirectory).toHaveBeenCalledWith(PREPARED_DIRECTORY);
  });

  it("surfaces a non-zero child exit code after exact-directory cleanup", async () => {
    const removeEvidenceDirectory = vi.fn(async () => undefined);
    const lifecycle = ports({
      launch: vi.fn(() => ({
        pid: 1234,
        result: Promise.resolve<CaptureProcessResult>({ code: 7, signal: null }),
        killTree: vi.fn(async () => undefined),
      })),
      removeEvidenceDirectory,
    });

    await expect(runBoundedCaptureProcess([], 5_000, lifecycle)).rejects.toThrow(
      /exited with code 7/u,
    );
    expect(removeEvidenceDirectory).toHaveBeenCalledWith(PREPARED_DIRECTORY);
  });

  it("kills the child tree at the deadline and removes only the prepared directory", async () => {
    const killTree = vi.fn(async () => undefined);
    const removeEvidenceDirectory = vi.fn(async () => undefined);
    const lifecycle = ports({
      launch: vi.fn(() => ({
        pid: 4321,
        result: new Promise<CaptureProcessResult>(() => undefined),
        killTree,
      })),
      wait: vi.fn(async () => undefined),
      removeEvidenceDirectory,
    });

    await expect(runBoundedCaptureProcess([], 250, lifecycle)).rejects.toThrow(
      /exceeded 250 ms and was terminated/u,
    );

    expect(killTree).toHaveBeenCalledOnce();
    expect(removeEvidenceDirectory).toHaveBeenCalledOnce();
    expect(removeEvidenceDirectory).toHaveBeenCalledWith(PREPARED_DIRECTORY);
  });

  it("preserves capture and cleanup failures in one AggregateError", async () => {
    const lifecycle = ports({
      launch: vi.fn(() => ({
        pid: 1234,
        result: Promise.resolve<CaptureProcessResult>({ code: 7, signal: null }),
        killTree: vi.fn(async () => undefined),
      })),
      removeEvidenceDirectory: vi.fn(async () => {
        throw new Error("cleanup failed");
      }),
    });

    await expect(runBoundedCaptureProcess([], 5_000, lifecycle)).rejects.toMatchObject({
      name: "AggregateError",
      errors: [
        expect.objectContaining({ message: expect.stringMatching(/exited with code 7/u) }),
        expect.objectContaining({ message: "cleanup failed" }),
      ],
    });
  });

  it("resolves taskkill from the trusted Windows system directory, not PATH", () => {
    expect(resolveWindowsTaskkillPath({ SystemRoot: String.raw`C:\Windows` })).toBe(
      String.raw`C:\Windows\System32\taskkill.exe`,
    );
    expect(resolveWindowsTaskkillPath({ WINDIR: String.raw`D:\Windows` })).toBe(
      String.raw`D:\Windows\System32\taskkill.exe`,
    );
  });

  it("fails closed when the Windows system directory is missing or relative", () => {
    expect(() => resolveWindowsTaskkillPath({})).toThrow(/system directory/u);
    expect(() => resolveWindowsTaskkillPath({ SystemRoot: "Windows" })).toThrow(
      /absolute Windows system directory/u,
    );
  });

  it("rejects an unsafe prepared path before launching a child", async () => {
    const launch = vi.fn(successfulChild);
    const removeEvidenceDirectory = vi.fn(async () => undefined);
    const lifecycle = ports({
      prepareEvidenceDirectory: vi.fn(async () =>
        join(dirname(tmpdir()), `${EVIDENCE_PREFIX}escape`),
      ),
      launch,
      removeEvidenceDirectory,
    });

    await expect(runBoundedCaptureProcess([], 5_000, lifecycle)).rejects.toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
    expect(launch).not.toHaveBeenCalled();
    expect(removeEvidenceDirectory).not.toHaveBeenCalled();
  });

  it("allows only a direct prefixed child of the configured temporary root", () => {
    const root = resolve("temporary-evidence-root");
    const candidate = join(root, `${EVIDENCE_PREFIX}capture-1`);

    expect(resolveEvidenceDirectoryForRemoval(candidate, root)).toBe(candidate);
  });

  it("rejects the temporary root itself", () => {
    const root = resolve("temporary-evidence-root");
    expect(() => resolveEvidenceDirectoryForRemoval(root, root)).toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
  });

  it("rejects an unprefixed direct child", () => {
    const root = resolve("temporary-evidence-root");
    expect(() => resolveEvidenceDirectoryForRemoval(join(root, "other-directory"), root)).toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
  });

  it("rejects a nested descendant", () => {
    const root = resolve("temporary-evidence-root");
    const nested = join(root, `${EVIDENCE_PREFIX}safe`, "nested");
    expect(() => resolveEvidenceDirectoryForRemoval(nested, root)).toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
  });

  it("rejects parent and prefix-lookalike escapes", () => {
    const root = resolve("temporary-evidence-root");
    const parentEscape = join(dirname(root), `${EVIDENCE_PREFIX}escape`);
    const lookalikeRoot = `${root}-other`;
    const lookalikeEscape = join(lookalikeRoot, `${EVIDENCE_PREFIX}escape`);

    expect(() => resolveEvidenceDirectoryForRemoval(parentEscape, root)).toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
    expect(() => resolveEvidenceDirectoryForRemoval(lookalikeEscape, root)).toThrow(
      /not a direct Runtime Human evidence directory/u,
    );
  });
});
