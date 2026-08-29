import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { loadContentCatalog } from "../catalog/content-catalog";

const execFileAsync = promisify(execFile);

const STUDIO_CONFIG_FILES = [
  "zones.json",
  "context-map.json",
  "models.json",
  "skill-map.json",
  "verification-policy.json",
] as const;

export type DoctorCheckV1 = Readonly<{
  id: string;
  ok: boolean;
  severity: "environment" | "content";
  detail: string;
}>;

export type DoctorReportV1 = Readonly<{
  ok: boolean;
  checks: readonly DoctorCheckV1[];
}>;

export async function runDoctor(
  options: Readonly<{ repositoryRoot: string }>,
): Promise<DoctorReportV1> {
  const repositoryRoot = resolve(options.repositoryRoot);
  const checks = [
    await checkNodeVersion(),
    await checkPnpmLockfile(repositoryRoot),
    await checkStudioConfigs(repositoryRoot),
    await checkContentGraph(repositoryRoot),
    await checkGit(),
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

async function checkNodeVersion(): Promise<DoctorCheckV1> {
  const major = Number.parseInt(process.version.replace(/^v/u, ""), 10);
  const ok = major >= 24 && major < 25;
  return {
    id: "node-version",
    ok,
    severity: "environment",
    detail: ok
      ? `Node.js ${process.version} satisfies the required major 24`
      : `Node.js ${process.version} does not satisfy the required major 24`,
  };
}

async function checkPnpmLockfile(repositoryRoot: string): Promise<DoctorCheckV1> {
  const ok = await isFile(join(repositoryRoot, "pnpm-lock.yaml"));
  return {
    id: "pnpm-lockfile",
    ok,
    severity: "environment",
    detail: ok ? "pnpm-lock.yaml found" : "pnpm-lock.yaml is missing",
  };
}

async function checkStudioConfigs(repositoryRoot: string): Promise<DoctorCheckV1> {
  const states = await Promise.all(
    STUDIO_CONFIG_FILES.map(async (file) => ({
      file,
      state: await readStudioConfigState(join(repositoryRoot, ".studio", file)),
    })),
  );
  const missing = states.filter((entry) => entry.state === "missing").map((entry) => entry.file);
  const invalid = states.filter((entry) => entry.state === "invalid").map((entry) => entry.file);
  const ok = missing.length === 0 && invalid.length === 0;
  const details: string[] = [];
  if (missing.length > 0) details.push(`missing: ${missing.join(", ")}`);
  if (invalid.length > 0) details.push(`invalid JSON: ${invalid.join(", ")}`);
  return {
    id: "studio-configs",
    ok,
    severity: "environment",
    detail: ok ? "All studio configs present and valid" : details.join("; "),
  };
}

async function readStudioConfigState(path: string): Promise<"ok" | "missing" | "invalid"> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return "missing";
    return "invalid";
  }
  try {
    JSON.parse(text);
    return "ok";
  } catch {
    return "invalid";
  }
}

async function checkContentGraph(repositoryRoot: string): Promise<DoctorCheckV1> {
  const loaded = await loadContentCatalog({ repositoryRoot });
  if (loaded.kind === "success") {
    return {
      id: "content-graph",
      ok: true,
      severity: "content",
      detail: `${loaded.catalog.entries.length} content entries`,
    };
  }
  const first = loaded.diagnostics[0];
  return {
    id: "content-graph",
    ok: false,
    severity: "content",
    detail:
      first === undefined
        ? "Content catalog failed without diagnostics"
        : `${first.code} ${first.message}`,
  };
}

async function checkGit(): Promise<DoctorCheckV1> {
  try {
    const { stdout } = await execFileAsync("git", ["--version"]);
    return { id: "git", ok: true, severity: "environment", detail: stdout.trim() };
  } catch (error) {
    return {
      id: "git",
      ok: false,
      severity: "environment",
      detail: `git is unavailable: ${readErrorMessage(error)}`,
    };
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    const metadata = await stat(path);
    return metadata.isFile();
  } catch {
    return false;
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ code?: unknown }>).code === code
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown doctor error";
}
