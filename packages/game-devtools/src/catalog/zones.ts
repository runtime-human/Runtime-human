import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ZoneDefinitionV1 = Readonly<{ id: string; paths: readonly string[] }>;

export async function loadZoneDefinitions(
  repositoryRoot: string,
): Promise<readonly ZoneDefinitionV1[] | undefined> {
  let text: string;
  try {
    text = await readFile(join(repositoryRoot, ".studio", "zones.json"), "utf8");
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
  return parseZoneDefinitions(text);
}

export function matchZonePath(pattern: string, repositoryPath: string): boolean {
  return matchSegments(toPosixSegments(pattern), toPosixSegments(repositoryPath));
}

export function zonesForPaths(
  zones: readonly ZoneDefinitionV1[],
  paths: readonly string[],
): readonly string[] {
  const matched = new Set<string>();
  for (const zone of zones) {
    if (paths.some((path) => zone.paths.some((pattern) => matchZonePath(pattern, path)))) {
      matched.add(zone.id);
    }
  }
  return [...matched].toSorted();
}

function parseZoneDefinitions(text: string): readonly ZoneDefinitionV1[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new TypeError(`.studio/zones.json is not valid JSON: ${readErrorMessage(error)}`, {
      cause: error,
    });
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(".studio/zones.json must contain an object with a zones array");
  }
  const zones = (value as Readonly<Record<string, unknown>>).zones;
  if (!Array.isArray(zones)) {
    throw new TypeError(".studio/zones.json must contain a zones array");
  }
  const definitions: ZoneDefinitionV1[] = [];
  for (const entry of zones) {
    definitions.push(parseZoneDefinition(entry));
  }
  return definitions;
}

function parseZoneDefinition(value: unknown): ZoneDefinitionV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(".studio/zones.json zone entries must be objects");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const { id, paths } = record;
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError(".studio/zones.json zone id must be a non-empty string");
  }
  if (!isStringArray(paths)) {
    throw new TypeError(`.studio/zones.json zone ${id} paths must be non-empty strings`);
  }
  return { id, paths };
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0)
  );
}

function toPosixSegments(path: string): readonly string[] {
  return path
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");
}

function matchSegments(pattern: readonly string[], segments: readonly string[]): boolean {
  let patternIndex = 0;
  let segmentIndex = 0;
  let wildcardIndex = -1;
  let wildcardSegmentIndex = 0;

  while (segmentIndex < segments.length) {
    const segment = segments[segmentIndex];
    const current = pattern[patternIndex];
    if (current === "**") {
      wildcardIndex = patternIndex;
      wildcardSegmentIndex = segmentIndex;
      patternIndex += 1;
      continue;
    }
    if (current !== undefined && segment !== undefined && matchSegment(current, segment)) {
      patternIndex += 1;
      segmentIndex += 1;
      continue;
    }
    if (wildcardIndex < 0) return false;
    patternIndex = wildcardIndex + 1;
    wildcardSegmentIndex += 1;
    segmentIndex = wildcardSegmentIndex;
  }

  while (pattern[patternIndex] === "**") patternIndex += 1;
  return patternIndex === pattern.length;
}

function matchSegment(pattern: string, segment: string): boolean {
  if (!pattern.includes("*")) return pattern === segment;
  const source = pattern.split("*").map(escapeRegExp).join("[^/]*");
  return new RegExp(`^${source}$`, "u").test(segment);
}

function escapeRegExp(part: string): string {
  return part.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ code?: unknown }>).code === "ENOENT"
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown zones config error";
}
