import { describe, expect, it, vi } from "vitest";

import {
  runBoundedCaptureProcess,
  type CaptureProcessPorts,
  type CaptureProcessResult,
} from "../tools/desktop-evidence/src/run-capture-process";

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
  const listEvidenceDirectories = vi
    .fn<() => Promise<ReadonlySet<string>>>()
    .mockResolvedValue(new Set<string>());

  return {
    launch: vi.fn(successfulChild),
    wait: vi.fn(never),
    listEvidenceDirectories,
    removeEvidenceDirectory: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("desktop evidence capture watchdog", () => {
  it("returns after a successful child capture without killing it", async () => {
    const launch = vi.fn(successfulChild);
    const lifecycle = ports({ launch });

    await expect(
      runBoundedCaptureProcess(["--sample-index=0"], 5_000, lifecycle),
    ).resolves.toBeUndefined();

    expect(launch).toHaveBeenCalledWith(["--sample-index=0"]);
    const child = launch.mock.results[0]?.value;
    expect(child?.killTree).not.toHaveBeenCalled();
    expect(lifecycle.removeEvidenceDirectory).not.toHaveBeenCalled();
  });

  it("surfaces a non-zero child exit code", async () => {
    const lifecycle = ports({
      launch: vi.fn(() => ({
        pid: 1234,
        result: Promise.resolve<CaptureProcessResult>({ code: 7, signal: null }),
        killTree: vi.fn(async () => undefined),
      })),
    });

    await expect(runBoundedCaptureProcess([], 5_000, lifecycle)).rejects.toThrow(
      /exited with code 7/u,
    );
  });

  it("kills the child tree at the deadline and removes only new evidence directories", async () => {
    const killTree = vi.fn(async () => undefined);
    const listEvidenceDirectories = vi
      .fn<() => Promise<ReadonlySet<string>>>()
      .mockResolvedValueOnce(new Set(["C:\\Temp\\runtime-human-desktop-evidence-existing"]))
      .mockResolvedValueOnce(
        new Set([
          "C:\\Temp\\runtime-human-desktop-evidence-existing",
          "C:\\Temp\\runtime-human-desktop-evidence-new",
        ]),
      );
    const removeEvidenceDirectory = vi.fn(async () => undefined);
    const lifecycle = ports({
      launch: vi.fn(() => ({
        pid: 4321,
        result: new Promise<CaptureProcessResult>(() => undefined),
        killTree,
      })),
      wait: vi.fn(async () => undefined),
      listEvidenceDirectories,
      removeEvidenceDirectory,
    });

    await expect(runBoundedCaptureProcess([], 250, lifecycle)).rejects.toThrow(
      /exceeded 250 ms and was terminated/u,
    );

    expect(killTree).toHaveBeenCalledOnce();
    expect(removeEvidenceDirectory).toHaveBeenCalledOnce();
    expect(removeEvidenceDirectory).toHaveBeenCalledWith(
      "C:\\Temp\\runtime-human-desktop-evidence-new",
    );
  });
});
