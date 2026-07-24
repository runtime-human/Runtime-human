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
