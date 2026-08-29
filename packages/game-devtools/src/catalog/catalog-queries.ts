import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import type { ContentCatalogEntryV1 } from "@runtime-human/game-content-compiler";

import type { ContentCatalog } from "./content-catalog";
import { loadZoneDefinitions, zonesForPaths, type ZoneDefinitionV1 } from "./zones";

const TEST_EXTENSIONS = new Set([".js", ".mjs", ".mts", ".ts", ".tsx"]);

export type CatalogEntryFilterV1 = Readonly<{
  kind?: ContentCatalogEntryV1["kind"];
  domain?: string;
  era?: string;
}>;

export function listCatalogEntries(
  catalog: ContentCatalog,
  filter?: CatalogEntryFilterV1,
): readonly ContentCatalogEntryV1[] {
  return catalog.entries.filter((entry) => matchesEntryFilter(entry, filter));
}

export function getCatalogEntry(
  catalog: ContentCatalog,
  id: string,
): ContentCatalogEntryV1 | undefined {
  return catalog.entries.find((entry) => entry.id === id);
}

export type CatalogReferencesV1 = Readonly<{
  id: string;
  outgoing: readonly { id: string; resolved: boolean }[];
  incoming: readonly string[];
}>;

export function catalogReferences(
  catalog: ContentCatalog,
  id: string,
): CatalogReferencesV1 | undefined {
  const entry = getCatalogEntry(catalog, id);
  if (entry === undefined) return undefined;

  const knownIds = new Set(catalog.entries.map((candidate) => candidate.id));
  return {
    id,
    outgoing: entry.references.map((reference) => ({
      id: reference,
      resolved: knownIds.has(reference),
    })),
    incoming: catalog.entries
      .filter((candidate) => candidate.id !== id && candidate.references.includes(id))
      .map((candidate) => candidate.id)
      .toSorted(),
  };
}

export type CatalogImpactV1 = Readonly<{
  id: string;
  sourcePath: string;
  consumers: readonly string[];
  tests: readonly string[];
  zones: readonly string[];
}>;

export async function catalogImpact(
  catalog: ContentCatalog,
  id: string,
  context?: Readonly<{ zones?: readonly ZoneDefinitionV1[]; testsRoot?: string }>,
): Promise<CatalogImpactV1 | undefined> {
  const entry = getCatalogEntry(catalog, id);
  if (entry === undefined) return undefined;

  const consumers = catalog.entries
    .filter((candidate) => candidate.id !== id && candidate.references.includes(id))
    .map((candidate) => candidate.id)
    .toSorted();
  const consumerPaths = consumers.flatMap((consumerId) => {
    const consumer = getCatalogEntry(catalog, consumerId);
    return consumer === undefined ? [] : [consumer.sourcePath];
  });

  const testsRoot = resolve(catalog.repositoryRoot, context?.testsRoot ?? "tests");
  const tests = await findTestsReferencingId(testsRoot, catalog.repositoryRoot, id);

  const zones = context?.zones ?? (await loadZoneDefinitions(catalog.repositoryRoot)) ?? [];
  const zoneIds = zonesForPaths(zones, [entry.sourcePath, ...consumerPaths, ...tests]);

  return { id, sourcePath: entry.sourcePath, consumers, tests, zones: zoneIds };
}

async function findTestsReferencingId(
  testsRoot: string,
  repositoryRoot: string,
  id: string,
): Promise<readonly string[]> {
  const matches: string[] = [];
  await scanTestsRoot(testsRoot, repositoryRoot, id, matches);
  return matches.toSorted();
}

async function scanTestsRoot(
  current: string,
  repositoryRoot: string,
  id: string,
  matches: string[],
): Promise<void> {
  const entries = await readDirectory(current);
  if (entries === undefined) return;

  await Promise.all(
    entries.map((entry) => scanTestEntry(entry, current, repositoryRoot, id, matches)),
  );
}

async function scanTestEntry(
  entry: Dirent,
  current: string,
  repositoryRoot: string,
  id: string,
  matches: string[],
): Promise<void> {
  const absolutePath = join(current, entry.name);
  if (entry.isDirectory()) {
    await scanTestsRoot(absolutePath, repositoryRoot, id, matches);
    return;
  }
  if (!entry.isFile() || !TEST_EXTENSIONS.has(extname(entry.name))) return;

  const text = await readFileOrUndefined(absolutePath);
  if (text !== undefined && text.includes(id)) {
    matches.push(toPosixPath(relative(repositoryRoot, absolutePath)));
  }
}

async function readDirectory(path: string): Promise<readonly Dirent[] | undefined> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return undefined;
  }
}

async function readFileOrUndefined(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function matchesEntryFilter(
  entry: ContentCatalogEntryV1,
  filter: CatalogEntryFilterV1 | undefined,
): boolean {
  if (filter === undefined) return true;
  if (filter.kind !== undefined && entry.kind !== filter.kind) return false;
  if (filter.domain !== undefined && entry.domain !== filter.domain) return false;
  if (filter.era !== undefined && entry.era !== filter.era) return false;
  return true;
}

function toPosixPath(path: string): string {
  return path.replaceAll("\\", "/");
}
