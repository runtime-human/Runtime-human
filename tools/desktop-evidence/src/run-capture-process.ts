import { execFile, spawn } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const EVIDENCE_DIRECTORY_PREFIX = "runtime-human-desktop-evidence-";
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
  launch(arguments_: readonly string[]): CaptureChildProcess;
  wait(milliseconds: number): Promise<void>;
  listEvidenceDirectories(): Promise<ReadonlySet<string>>;
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

  const directoriesBefore = await ports.listEvidenceDirectories();
  const child = ports.launch(arguments_);

  try {
    const outcome = await Promise.race([
      child.result.then((result) => ({ kind: "exit" as const, result })),
      ports.wait(deadlineMs).then(() => ({ kind: "timeout" as const })),
    ]);

    if (outcome.kind === "timeout") {
      await child.killTree();
      throw new Error(`Desktop evidence capture exceeded ${deadlineMs} ms and was terminated`);
    }

    if (outcome.result.code !== 0) {
      const suffix =
        outcome.result.signal === null ? "" : ` after signal ${outcome.result.signal}`;
      throw new Error(
        `Desktop evidence capture exited with code ${String(outcome.result.code)}${suffix}`,
      );
    }
  } finally {
    const directoriesAfter = await ports.listEvidenceDirectories();
    const newDirectories = [...directoriesAfter]
      .filter((path) => !directoriesBefore.has(path))
      .sort((left, right) => left.localeCompare(right));

    for (const path of newDirectories) {
      await ports.removeEvidenceDirectory(path);
    }
  }
}

function launchCaptureWorker(arguments_: readonly string[]): CaptureChildProcess {
  const workerPath = resolve(import.meta.dirname, "capture-startup.ts");
  const child = spawn(process.execPath, ["--import=tsx", workerPath, ...arguments_], {
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

async function listEvidenceDirectories(): Promise<ReadonlySet<string>> {
  const root = tmpdir();
  const entries = await readdir(root, { withFileTypes: true });
  return new Set(
    entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(EVIDENCE_DIRECTORY_PREFIX))
      .map((entry) => join(root, entry.name)),
  );
}

const DEFAULT_PORTS = Object.freeze<CaptureProcessPorts>({
  launch: launchCaptureWorker,
  wait: async (milliseconds) => {
    await delay(milliseconds, undefined, { ref: false });
  },
  listEvidenceDirectories,
  removeEvidenceDirectory: async (path) => {
    await rm(path, {
      recursive: true,
      force: true,
      maxRetries: CLEANUP_RETRIES,
      retryDelay: CLEANUP_RETRY_DELAY_MS,
    });
  },
});

function isDirectExecution(moduleUrl: string, scriptPath: string | undefined): boolean {
  return scriptPath !== undefined && moduleUrl === pathToFileURL(resolve(scriptPath)).href;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  runBoundedCaptureProcess(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
