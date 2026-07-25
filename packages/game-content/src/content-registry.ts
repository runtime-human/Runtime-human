import type { Fingerprint } from "@runtime-human/game-schema";

import type {
  CompiledContentChunkDescriptorV1,
  CompiledContentChunkV1,
  CompiledContentEntryV1,
  CompiledContentManifestV1,
  ContentKindV1,
} from "./compiled-content";
import { CompiledContentError } from "./content-errors";
import type { CompiledContentValidators } from "./compiled-content-runtime";
import { compareText } from "./compiled-content-shape";

const EMPTY_ENTRIES = Object.freeze([]) as readonly CompiledContentEntryV1[];

export type ContentRegistry = Readonly<{
  contentFingerprint: Fingerprint;
  get(id: string): CompiledContentEntryV1 | undefined;
  require(id: string): CompiledContentEntryV1;
  listByKind(kind: ContentKindV1): readonly CompiledContentEntryV1[];
}>;

export function createContentRegistryWithValidators(
  validators: CompiledContentValidators,
  manifestValue: CompiledContentManifestV1,
  chunkValues: readonly CompiledContentChunkV1[],
  requiredChunkIdsValue?: readonly string[],
): ContentRegistry {
  const manifest = validators.validateCompiledContentManifest(manifestValue);
  const allDescriptors = new Map(
    manifest.chunks.map((descriptor) => [descriptor.chunkId, descriptor]),
  );
  const requiredDescriptors = resolveRequiredDescriptors(
    manifest,
    allDescriptors,
    requiredChunkIdsValue,
  );
  const requiredById = new Map(
    requiredDescriptors.map((descriptor) => [descriptor.chunkId, descriptor]),
  );
  const chunks = new Map<string, CompiledContentChunkV1>();

  for (const chunkValue of chunkValues) {
    const chunkId = validators.readCandidateChunkId(chunkValue);
    const descriptor = requiredById.get(chunkId);
    if (descriptor === undefined) {
      throw new CompiledContentError(
        "UNEXPECTED_CHUNK",
        `Compiled content chunk is not required by this registry: ${chunkId}`,
        { chunkId },
      );
    }
    if (chunks.has(chunkId)) {
      throw new CompiledContentError(
        "DUPLICATE_CHUNK",
        `Duplicate compiled content chunk: ${chunkId}`,
        { chunkId },
      );
    }
    const chunk = validators.validateCompiledContentChunk(chunkValue);
    verifyDescriptor(descriptor, chunk);
    chunks.set(chunkId, chunk);
  }

  for (const descriptor of requiredDescriptors) {
    if (!chunks.has(descriptor.chunkId)) {
      throw new CompiledContentError(
        "MISSING_CHUNK",
        `Required compiled content chunk is missing: ${descriptor.chunkId}`,
        { chunkId: descriptor.chunkId },
      );
    }
  }

  const entries = collectEntries(requiredDescriptors, chunks);
  verifyEntryPoints(manifest, requiredDescriptors, entries);
  verifyReferences(entries);
  return buildRegistry(manifest, entries);
}

function resolveRequiredDescriptors(
  manifest: CompiledContentManifestV1,
  allDescriptors: ReadonlyMap<string, CompiledContentChunkDescriptorV1>,
  requiredChunkIdsValue: readonly string[] | undefined,
): readonly CompiledContentChunkDescriptorV1[] {
  const requiredChunkIds =
    requiredChunkIdsValue === undefined
      ? manifest.chunks.map((descriptor) => descriptor.chunkId)
      : [...requiredChunkIdsValue];

  let previous: string | undefined;
  const requiredDescriptors: CompiledContentChunkDescriptorV1[] = [];
  for (const chunkId of requiredChunkIds) {
    if (typeof chunkId !== "string" || chunkId.length === 0) {
      throw new CompiledContentError(
        "INVALID_SHAPE",
        "Required compiled content chunk IDs must be non-empty strings",
        { path: "requiredChunkIds" },
      );
    }
    if (previous !== undefined) {
      const order = compareText(previous, chunkId);
      if (order === 0) {
        throw new CompiledContentError(
          "DUPLICATE_CHUNK",
          `Duplicate required compiled content chunk: ${chunkId}`,
          { chunkId },
        );
      }
      if (order > 0) {
        throw new CompiledContentError(
          "INVALID_SHAPE",
          "Required compiled content chunk IDs must be sorted",
          { path: "requiredChunkIds" },
        );
      }
    }
    const descriptor = allDescriptors.get(chunkId);
    if (descriptor === undefined) {
      throw new CompiledContentError(
        "MISSING_CHUNK",
        `Required compiled content chunk is not declared by the manifest: ${chunkId}`,
        { chunkId },
      );
    }
    requiredDescriptors.push(descriptor);
    previous = chunkId;
  }
  return Object.freeze(requiredDescriptors);
}

function verifyDescriptor(
  descriptor: CompiledContentChunkDescriptorV1,
  chunk: CompiledContentChunkV1,
): void {
  const contentIds = chunk.entries.map((entry) => entry.id);
  const matches =
    descriptor.era === chunk.era &&
    descriptor.domain === chunk.domain &&
    descriptor.chunkFingerprint === chunk.chunkFingerprint &&
    sameStrings(descriptor.contentIds, contentIds);
  if (!matches) {
    throw new CompiledContentError(
      "DESCRIPTOR_MISMATCH",
      `Manifest descriptor does not match compiled content chunk: ${chunk.chunkId}`,
      { chunkId: chunk.chunkId },
    );
  }
}

function collectEntries(
  descriptors: readonly CompiledContentChunkDescriptorV1[],
  chunks: ReadonlyMap<string, CompiledContentChunkV1>,
): ReadonlyMap<string, CompiledContentEntryV1> {
  const entries = new Map<string, CompiledContentEntryV1>();
  for (const descriptor of descriptors) {
    const chunk = chunks.get(descriptor.chunkId);
    if (chunk === undefined) continue;
    for (const entry of chunk.entries) {
      if (entries.has(entry.id)) {
        throw new CompiledContentError(
          "DUPLICATE_CONTENT_ID",
          `Duplicate compiled content ID: ${entry.id}`,
          { contentId: entry.id },
        );
      }
      entries.set(entry.id, entry);
    }
  }
  return entries;
}

function verifyEntryPoints(
  manifest: CompiledContentManifestV1,
  descriptors: readonly CompiledContentChunkDescriptorV1[],
  entries: ReadonlyMap<string, CompiledContentEntryV1>,
): void {
  const loadedContentIds = new Set(descriptors.flatMap((descriptor) => descriptor.contentIds));
  const expectedEntryPointIds = manifest.entryPointIds.filter((id) => loadedContentIds.has(id));
  const actualEntryPointIds = [...entries.values()]
    .filter((entry) => entry.entryPoint)
    .map((entry) => entry.id)
    .toSorted(compareText);
  if (!sameStrings(expectedEntryPointIds, actualEntryPointIds)) {
    throw new CompiledContentError(
      "DESCRIPTOR_MISMATCH",
      "Manifest entry points do not match loaded compiled content entries",
    );
  }
}

function verifyReferences(entries: ReadonlyMap<string, CompiledContentEntryV1>): void {
  for (const entry of entries.values()) {
    for (const reference of entry.references) {
      if (!entries.has(reference)) {
        throw new CompiledContentError(
          "MISSING_REFERENCE",
          `Compiled content reference is missing from the loaded registry: ${reference}`,
          { contentId: entry.id, reference },
        );
      }
    }
  }
}

function buildRegistry(
  manifest: CompiledContentManifestV1,
  entries: ReadonlyMap<string, CompiledContentEntryV1>,
): ContentRegistry {
  const byKind = new Map<ContentKindV1, readonly CompiledContentEntryV1[]>();
  for (const kind of ["event", "reference", "storylet", "technology"] as const) {
    byKind.set(
      kind,
      Object.freeze(
        [...entries.values()]
          .filter((entry) => entry.kind === kind)
          .toSorted((left, right) => compareText(left.id, right.id)),
      ),
    );
  }

  return Object.freeze({
    contentFingerprint: manifest.contentFingerprint,
    get(id: string): CompiledContentEntryV1 | undefined {
      return entries.get(id);
    },
    require(id: string): CompiledContentEntryV1 {
      const entry = entries.get(id);
      if (entry === undefined) {
        throw new CompiledContentError(
          "CONTENT_NOT_FOUND",
          `Compiled content ID was not found: ${id}`,
          { contentId: id },
        );
      }
      return entry;
    },
    listByKind(kind: ContentKindV1): readonly CompiledContentEntryV1[] {
      return byKind.get(kind) ?? EMPTY_ENTRIES;
    },
  });
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
