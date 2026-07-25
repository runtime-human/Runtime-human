import { lstat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

export async function resolveRepositoryPath(
  repositoryRoot: string,
  normalizedRelativePath: string,
  description: string,
): Promise<string> {
  const root = resolve(repositoryRoot);
  const absolutePath = resolve(root, ...normalizedRelativePath.split("/"));
  const resolvedRelativePath = toPosixPath(relative(root, absolutePath));
  if (resolvedRelativePath !== normalizedRelativePath) {
    throw new TypeError(`${description} must stay inside repository root`);
  }

  await rejectSymbolicLinkComponents(root, normalizedRelativePath, description);
  return absolutePath;
}

async function rejectSymbolicLinkComponents(
  repositoryRoot: string,
  normalizedRelativePath: string,
  description: string,
): Promise<void> {
  let current = repositoryRoot;
  for (const segment of normalizedRelativePath.split("/")) {
    current = join(current, segment);
    const metadata = await lstatIfPresent(current);
    if (metadata === undefined) return;
    if (metadata.isSymbolicLink()) {
      throw new TypeError(`${description} must not traverse symbolic links`);
    }
  }
}

async function lstatIfPresent(
  path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return undefined;
    throw error;
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

function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}
