import { normalizeSourcePath } from "./parse-content-sources";
import { compareText } from "./content-types";

export type ContentBuildConfig = Readonly<{
  sourceRoots: readonly string[];
  outputRoot: string;
}>;

const CONFIG_PROPERTIES = new Set(["sourceRoots", "outputRoot"]);

export function parseContentBuildConfig(value: unknown): ContentBuildConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Content build config must be an object");
  }

  const record = value as Readonly<Record<string, unknown>>;
  for (const property of Object.keys(record).toSorted(compareText)) {
    if (!CONFIG_PROPERTIES.has(property)) {
      throw new TypeError(`Content build config contains unknown property ${property}`);
    }
  }

  const sourceRoots = parseSourceRoots(record.sourceRoots);
  const outputRoot = requireNormalizedPath(
    record.outputRoot,
    "Content build outputRoot must be a normalized relative path",
  );

  return { sourceRoots, outputRoot };
}

function parseSourceRoots(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Content build sourceRoots must be a non-empty array");
  }

  const roots: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    const root = requireNormalizedPath(
      candidate,
      "Content build source root must be a normalized relative path",
    );
    if (seen.has(root)) {
      throw new TypeError(`Duplicate content build source root ${root}`);
    }
    seen.add(root);
    roots.push(root);
  }

  return roots;
}

function requireNormalizedPath(value: unknown, message: string): string {
  if (typeof value !== "string" || normalizeSourcePath(value) !== value) {
    throw new TypeError(message);
  }
  return value;
}

/**
 * REF-02B0: the new January v2 bundle must never read the legacy bundle's
 * sources or publish over its files. Paths are repository-relative and
 * compared on segment boundaries (so "programming" and "programming-v2"
 * are distinct). Both configs are parsed again to fail closed on invalid
 * paths, even when supplied by programmatic callers.
 *
 * This is a preflight for REF-02B1's dual-bundle build. It does not change
 * the legacy compiler configuration or publish v2 content.
 */
export function assertIsolatedContentBuildNamespaces(
  legacy: ContentBuildConfig,
  additional: ContentBuildConfig,
): void {
  const oldBuild = parseContentBuildConfig(legacy);
  const newBuild = parseContentBuildConfig(additional);
  const pathOverlaps = (left: string, right: string): boolean => {
    const oldPath = windowsContentNamespaceKey(left);
    const newPath = windowsContentNamespaceKey(right);
    return (
      oldPath === newPath || oldPath.startsWith(`${newPath}/`) || newPath.startsWith(`${oldPath}/`)
    );
  };

  for (const [label, build] of [
    ["legacy", oldBuild],
    ["additional", newBuild],
  ] as const) {
    for (const sourceRoot of build.sourceRoots) {
      if (pathOverlaps(sourceRoot, build.outputRoot)) {
        throw new TypeError(
          `Content build ${label} source/output overlap: ${sourceRoot} / ${build.outputRoot}`,
        );
      }
    }
  }

  for (const oldPath of [...oldBuild.sourceRoots, oldBuild.outputRoot]) {
    for (const newPath of [...newBuild.sourceRoots, newBuild.outputRoot]) {
      if (pathOverlaps(oldPath, newPath)) {
        throw new TypeError(`Content build namespaces overlap: ${oldPath} / ${newPath}`);
      }
    }
  }
}

/**
 * The desktop publisher runs on Windows. Treat source and output paths as
 * case-insensitive namespaces even when tests execute on a case-sensitive
 * host. Reject ambiguous Win32 path spellings instead of relying on the host
 * filesystem: trailing dots/spaces, device names, and invalid path characters
 * can cause an apparent sibling to alias an existing directory.
 *
 * Both sides must use NFC spelling; the comparison is intentionally
 * conservative and does not create or inspect filesystem paths.
 */
function windowsContentNamespaceKey(path: string): string {
  for (const segment of path.split("/")) {
    if (
      segment !== segment.normalize("NFC") ||
      /[. ]$/u.test(segment) ||
      /[\u0000-\u001f<>:"|?*]/u.test(segment) ||
      /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/iu.test(segment)
    ) {
      throw new TypeError(`Content build namespace path is not Windows-portable: ${path}`);
    }
  }
  return path.toLowerCase();
}
