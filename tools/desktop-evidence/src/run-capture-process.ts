import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const EVIDENCE_DIRECTORY_PREFIX = "runtime-human-desktop-evidence-";
export const EVIDENCE_DIRECTORY_ENV = "RUNTIME_HUMAN_EVIDENCE_DATA_DIR";
const DEFAULT_CAPTURE_DEADLINE_MS = 300_000;
const CLEANUP_RETRIES = 20;
const CLEANUP_RETRY_DELAY_MS = 100;

export type CaptureProcessResult = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
}>;

export type CaptureChildProcess = Readonly<{
  pid: number;
  result: Promise<CaptureProcessResult>;
  killTree(): Promise<void>;
}>;

export type CaptureProcessPorts = Readonly<{
  prepareEvidenceDirectory(): Promise<string>;
  launch(arguments_: readonly string[], evidenceDirectory: string): CaptureChildProcess;
  wait(milliseconds: number): Promise<void>;
  removeEvidenceDirectory(path: string): Promise<void>;
}>;

export async function runBoundedCaptureProcess(
  arguments_: readonly string[],
  deadlineMs = DEFAULT_CAPTURE_DEADLINE_MS,
  ports: CaptureProcessPorts = DEFAULT_PORTS,
): Promise<void> {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) {
    throw new Error("Desktop evidence capture deadline must be a positive safe integer");
  }

  const evidenceDirectory = resolveEvidenceDirectoryForRemoval(
    await ports.prepareEvidenceDirectory(),
  );
  let captureFailure: Error | undefined;

  try {
    const child = ports.launch(arguments_, evidenceDirectory);
    const outcome = await Promise.race([
      child.result.then((result) => ({ kind: "exit" as const, result })),
      ports.wait(deadlineMs).then(() => ({ kind: "timeout" as const })),
    ]);

    if (outcome.kind === "timeout") {
      try {
        await child.killTree();
        captureFailure = new Error(
          `Desktop evidence capture exceeded ${deadlineMs} ms and was terminated`,
        );
      } catch (error) {
        captureFailure = new Error(
          `Desktop evidence capture exceeded ${deadlineMs} ms and process-tree termination failed`,
          { cause: error },
        );
      }
    } else if (outcome.result.code !== 0) {
      const suffix = outcome.result.signal === null ? "" : ` after signal ${outcome.result.signal}`;
      captureFailure = new Error(
        `Desktop evidence capture exited with code ${String(outcome.result.code)}${suffix}`,
      );
    }
  } catch (error) {
    captureFailure = toError(error);
  }

  let cleanupFailure: Error | undefined;
  try {
    await ports.removeEvidenceDirectory(evidenceDirectory);
  } catch (error) {
    cleanupFailure = toError(error);
  }

  if (captureFailure !== undefined && cleanupFailure !== undefined) {
    throw new AggregateError(
      [captureFailure, cleanupFailure],
      "Desktop evidence capture and exact-directory cleanup both failed",
    );
  }
  if (captureFailure !== undefined) throw captureFailure;
  if (cleanupFailure !== undefined) throw cleanupFailure;
}

function launchCaptureWorker(
  arguments_: readonly string[],
  evidenceDirectory: string,
): CaptureChildProcess {
  const workerPath = resolve(import.meta.dirname, "capture-startup.ts");
  const child = spawn(process.execPath, ["--import=tsx", workerPath, ...arguments_], {
    env: {
      ...process.env,
      [EVIDENCE_DIRECTORY_ENV]: evidenceDirectory,
    },
    stdio: "inherit",
    windowsHide: true,
  });
  const pid = child.pid;
  if (pid === undefined) {
    throw new Error("Desktop evidence worker did not expose a process identifier");
  }

  const result = new Promise<CaptureProcessResult>((resolveResult, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveResult({ code, signal }));
  });

  return Object.freeze({
    pid,
    result,
    killTree: async () => {
      if (process.platform === "win32") {
        try {
          await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"], {
            timeout: 10_000,
            windowsHide: true,
          });
        } catch (error) {
          if (child.exitCode === null && child.signalCode === null) throw error;
        }
        return;
      }

      child.kill("SIGKILL");
    },
  });
}

export function resolveEvidenceDirectoryForRemoval(path: string, root = tmpdir()): string {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(path);
  const name = basename(resolvedPath);
  const expectedPath = join(resolvedRoot, name);

  if (
    name.length <= EVIDENCE_DIRECTORY_PREFIX.length ||
    !name.startsWith(EVIDENCE_DIRECTORY_PREFIX) ||
    dirname(resolvedPath) !== resolvedRoot ||
    resolvedPath !== expectedPath
  ) {
    throw new Error("Cleanup target is not a direct Runtime Human evidence directory");
  }

  return expectedPath;
}

const DEFAULT_PORTS = Object.freeze<CaptureProcessPorts>({
  prepareEvidenceDirectory: async () => mkdtemp(join(tmpdir(), EVIDENCE_DIRECTORY_PREFIX)),
  launch: launchCaptureWorker,
  wait: async (milliseconds) => {
    await delay(milliseconds, undefined, { ref: false });
  },
  removeEvidenceDirectory: async (path) => {
    const safePath = resolveEvidenceDirectoryForRemoval(path);
    await rm(safePath, {
      recursive: true,
      force: true,
      maxRetries: CLEANUP_RETRIES,
      retryDelay: CLEANUP_RETRY_DELAY_MS,
    });
  },
});

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function isDirectExecution(moduleUrl: string, scriptPath: string | undefined): boolean {
  return scriptPath !== undefined && moduleUrl === pathToFileURL(resolve(scriptPath)).href;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  runBoundedCaptureProcess(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
