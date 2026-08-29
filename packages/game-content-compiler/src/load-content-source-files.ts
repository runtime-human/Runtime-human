import type { Stats } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { normalizeSourcePath } from "./parse-content-sources";
import { resolveRepositoryPath } from "./repository-path";
import { compareText, type ContentSourceFile } from "./content-types";

export type LoadContentSourceFilesOptions = Readonly<{
  repositoryRoot: string;
  sourceRoots: readonly string[];
}>;

export async function loadContentSourceFiles(
  options: LoadContentSourceFilesOptions,
): Promise<readonly ContentSourceFile[]> {
  const repositoryRoot = resolve(options.repositoryRoot);
  const files: ContentSourceFile[] = [];
  const seenPaths = new Set<string>();

  for (const sourceRoot of options.sourceRoots) {
    const normalizedRoot = requireNormalizedSourceRoot(sourceRoot);
    const absoluteRoot = await resolveRepositoryPath(
      repositoryRoot,
      normalizedRoot,
      "Content source root",
    );
    await rejectMissingSourceRoot(normalizedRoot, absoluteRoot);
    await discoverSourceFiles(repositoryRoot, absoluteRoot, seenPaths, files);
  }

  return files.toSorted((left, right) => compareText(left.path, right.path));
}

function requireNormalizedSourceRoot(sourceRoot: string): string {
  const normalized = normalizeSourcePath(sourceRoot);
  if (normalized === null || normalized !== sourceRoot) {
    throw new TypeError(
      `Content source root must be a normalized relative path: ${JSON.stringify(sourceRoot)}`,
    );
  }
  return normalized;
}

async function discoverSourceFiles(
  repositoryRoot: string,
  absoluteRoot: string,
  seenPaths: Set<string>,
  files: ContentSourceFile[],
): Promise<void> {
  const pending = [absoluteRoot];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    await processSourceEntry(repositoryRoot, current, pending, seenPaths, files);
  }
}

async function processSourceEntry(
  repositoryRoot: string,
  current: string,
  pending: string[],
  seenPaths: Set<string>,
  files: ContentSourceFile[],
): Promise<void> {
  const metadata = await lstat(current);
  rejectSymbolicLink(repositoryRoot, current, metadata);

  if (metadata.isDirectory()) {
    await enqueueDirectoryChildren(current, pending);
    return;
  }
  if (!metadata.isFile() || !current.endsWith(".jsonc")) return;

  await addSourceFile(repositoryRoot, current, seenPaths, files);
}

function rejectSymbolicLink(repositoryRoot: string, current: string, metadata: Stats): void {
  if (!metadata.isSymbolicLink()) return;
  throw new TypeError(
    `Symbolic links are not allowed in content source roots: ${JSON.stringify(
      toRepositoryPath(repositoryRoot, current),
    )}`,
  );
}

async function enqueueDirectoryChildren(current: string, pending: string[]): Promise<void> {
  const children = (await readdir(current)).toSorted(compareText);
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const child = children[index];
    if (child !== undefined) pending.push(resolve(current, child));
  }
}

async function addSourceFile(
  repositoryRoot: string,
  current: string,
  seenPaths: Set<string>,
  files: ContentSourceFile[],
): Promise<void> {
  const path = toRepositoryPath(repositoryRoot, current);
  if (seenPaths.has(path)) {
    throw new TypeError(`Duplicate content source path ${path}`);
  }

  seenPaths.add(path);
  files.push({ path, text: stripByteOrderMark(await readFile(current, "utf8")) });
}

async function rejectMissingSourceRoot(
  normalizedRoot: string,
  absoluteRoot: string,
): Promise<void> {
  const metadata = await lstat(absoluteRoot).catch((error: unknown) => {
    if (hasErrorCode(error, "ENOENT")) return undefined;
    throw error;
  });
  if (metadata === undefined) {
    throw new TypeError(`Content source root does not exist: ${normalizedRoot}`);
  }
  if (!metadata.isDirectory()) {
    throw new TypeError(`Content source root must be a directory: ${normalizedRoot}`);
  }
}

function stripByteOrderMark(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ code?: unknown }>).code === code
  );
}

function toRepositoryPath(repositoryRoot: string, absolutePath: string): string {
  const path = toPosixPath(relative(repositoryRoot, absolutePath));
  if (normalizeSourcePath(path) !== path) {
    throw new TypeError(`Discovered content path is not normalized: ${JSON.stringify(path)}`);
  }
  return path;
}

function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}
