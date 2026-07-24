import { lstat, readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { normalizeSourcePath } from "./parse-content-sources";
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
    const absoluteRoot = resolve(repositoryRoot, ...normalizedRoot.split("/"));
    assertResolvedPath(repositoryRoot, absoluteRoot, normalizedRoot);
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

function assertResolvedPath(
  repositoryRoot: string,
  absolutePath: string,
  expectedRelativePath: string,
): void {
  const relativePath = toPosixPath(relative(repositoryRoot, absolutePath));
  if (relativePath !== expectedRelativePath) {
    throw new TypeError(
      `Content source root must stay inside repository root: ${JSON.stringify(expectedRelativePath)}`,
    );
  }
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

    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) {
      throw new TypeError(
        `Symbolic links are not allowed in content source roots: ${JSON.stringify(
          toRepositoryPath(repositoryRoot, current),
        )}`,
      );
    }

    if (metadata.isDirectory()) {
      const children = (await readdir(current)).toSorted(compareText);
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child !== undefined) pending.push(resolve(current, child));
      }
      continue;
    }

    if (!metadata.isFile() || !current.endsWith(".jsonc")) continue;

    const path = toRepositoryPath(repositoryRoot, current);
    if (seenPaths.has(path)) {
      throw new TypeError(`Duplicate content source path ${path}`);
    }

    seenPaths.add(path);
    files.push({ path, text: await readFile(current, "utf8") });
  }
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
