import { isAbsolute, relative, resolve, sep } from "node:path";

export type StartupCaptureOptions = Readonly<{
  binaryPath: string;
  commit: string;
  outputPath: string;
  process: "cold-process" | "warm-process";
  osCache: "cold-os-cache" | "warm-os-cache";
  database: "new-database" | "existing-clean-database";
  sampleRole: "warmup" | "measurement";
  sampleIndex: number;
}>;

const PROCESS_CLASSES = new Set<StartupCaptureOptions["process"]>([
  "cold-process",
  "warm-process",
]);
const CACHE_CLASSES = new Set<StartupCaptureOptions["osCache"]>([
  "cold-os-cache",
  "warm-os-cache",
]);
const DATABASE_CLASSES = new Set<StartupCaptureOptions["database"]>([
  "new-database",
  "existing-clean-database",
]);
const SAMPLE_ROLES = new Set<StartupCaptureOptions["sampleRole"]>([
  "warmup",
  "measurement",
]);

export function parseStartupCaptureArguments(
  arguments_: readonly string[],
  repositoryRoot = process.cwd(),
): StartupCaptureOptions {
  const values = new Map<string, string>();
  const allowed = new Set([
    "--binary",
    "--commit",
    "--output",
    "--process",
    "--os-cache",
    "--database",
    "--sample-role",
    "--sample-index",
  ]);

  for (const argument of arguments_) {
    if (argument === "--") continue;
    const separator = argument.indexOf("=");
    if (separator <= 0) throw new Error(`Invalid startup capture option: ${argument}`);
    const key = argument.slice(0, separator);
    const value = argument.slice(separator + 1);
    if (!allowed.has(key)) throw new Error(`Unknown startup capture option: ${key}`);
    if (value.length === 0) throw new Error(`${key} requires a value`);
    if (values.has(key)) throw new Error(`${key} may be specified only once`);
    values.set(key, value);
  }

  const sampleIndex = parseSampleIndex(requireOption(values, "--sample-index"));
  const processClass = parseClosed(
    requireOption(values, "--process"),
    PROCESS_CLASSES,
    "--process",
  );
  const osCache = parseClosed(
    requireOption(values, "--os-cache"),
    CACHE_CLASSES,
    "--os-cache",
  );
  const database = parseClosed(
    requireOption(values, "--database"),
    DATABASE_CLASSES,
    "--database",
  );
  const sampleRole = parseClosed(
    requireOption(values, "--sample-role"),
    SAMPLE_ROLES,
    "--sample-role",
  );
  const binaryPath = resolve(
    repositoryRoot,
    values.get("--binary") ??
      "apps/desktop/src-tauri/target/release/runtime-human-desktop.exe",
  );
  const rawOutputRoot = resolve(repositoryRoot, "artifacts/performance/raw");
  const defaultOutputName = [
    "startup-shell-fmp",
    processClass,
    osCache,
    database,
    sampleRole,
    `${sampleIndex}.json`,
  ].join("-");
  const outputPath = resolve(
    repositoryRoot,
    values.get("--output") ?? `artifacts/performance/raw/${defaultOutputName}`,
  );
  requireRawJsonOutputPath(outputPath, rawOutputRoot);

  return Object.freeze({
    binaryPath,
    commit: parseCommit(requireOption(values, "--commit")),
    outputPath,
    process: processClass,
    osCache,
    database,
    sampleRole,
    sampleIndex,
  });
}

function requireOption(values: ReadonlyMap<string, string>, name: string): string {
  const value = values.get(name);
  if (value === undefined) throw new Error(`${name} is required`);
  return value;
}

function parseCommit(value: string): string {
  if (!/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error("--commit must be a lowercase 40-character Git SHA");
  }
  return value;
}

function parseSampleIndex(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("--sample-index must be a non-negative safe integer");
  }
  return parsed;
}

function parseClosed<T extends string>(
  value: string,
  allowed: ReadonlySet<T>,
  name: string,
): T {
  if (!allowed.has(value as T)) throw new Error(`${name} has an unsupported value`);
  return value as T;
}

function requireRawJsonOutputPath(outputPath: string, rawOutputRoot: string): void {
  const relativePath = relative(rawOutputRoot, outputPath);
  const outsideRoot =
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath);
  if (outsideRoot || relativePath.length === 0 || !relativePath.endsWith(".json")) {
    throw new Error("--output must be a .json file inside artifacts/performance/raw");
  }
}
