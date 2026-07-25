import type {
  CompiledContentChunkDescriptorV1,
  CompiledContentEntryV1,
  CompiledContentProvenanceV1,
} from "./compiled-content";
import { CompiledContentError } from "./content-errors";
import {
  compareText,
  deepFreeze,
  invalidShape,
  requireArray,
  requireIdentifier,
} from "./compiled-content-shape";

export function requireSortedChunkDescriptors(
  values: readonly CompiledContentChunkDescriptorV1[],
): void {
  let previous: string | undefined;
  for (const value of values) {
    if (previous === value.chunkId) {
      throw new CompiledContentError(
        "DUPLICATE_CHUNK",
        `Duplicate manifest chunk descriptor: ${value.chunkId}`,
        { chunkId: value.chunkId },
      );
    }
    if (previous !== undefined && compareText(previous, value.chunkId) > 0) {
      throw invalidShape("manifest.chunks must be sorted by chunkId", "manifest.chunks");
    }
    previous = value.chunkId;
  }
}

export function requireUniqueManifestContentIds(
  descriptors: readonly CompiledContentChunkDescriptorV1[],
): void {
  const contentIds = new Set<string>();
  for (const descriptor of descriptors) {
    for (const contentId of descriptor.contentIds) {
      if (contentIds.has(contentId)) {
        throw new CompiledContentError(
          "DUPLICATE_CONTENT_ID",
          `Duplicate manifest content ID: ${contentId}`,
          { contentId },
        );
      }
      contentIds.add(contentId);
    }
  }
}

export function requireManifestEntryPoints(
  entryPointIds: readonly string[],
  descriptors: readonly CompiledContentChunkDescriptorV1[],
): void {
  const contentIds = new Set(descriptors.flatMap((descriptor) => descriptor.contentIds));
  for (const entryPointId of entryPointIds) {
    if (!contentIds.has(entryPointId)) {
      throw new CompiledContentError(
        "DESCRIPTOR_MISMATCH",
        `Manifest entry point is not declared by any chunk: ${entryPointId}`,
        { contentId: entryPointId },
      );
    }
  }
}

export function requireSortedEntries(values: readonly CompiledContentEntryV1[]): void {
  let previous: string | undefined;
  for (const value of values) {
    if (previous === value.id) {
      throw new CompiledContentError(
        "DUPLICATE_CONTENT_ID",
        `Duplicate compiled content ID in chunk: ${value.id}`,
        { contentId: value.id },
      );
    }
    if (previous !== undefined && compareText(previous, value.id) > 0) {
      throw invalidShape("chunk.entries must be sorted by ID", "chunk.entries");
    }
    previous = value.id;
  }
}

export function requireSortedUniqueStrings(
  value: unknown,
  path: string,
): readonly string[] {
  const values = requireArray(value, path).map((item, index) =>
    requireIdentifier(item, `${path}[${index}]`),
  );
  let previous: string | undefined;
  for (const current of values) {
    if (previous !== undefined && compareText(previous, current) >= 0) {
      throw invalidShape(`${path} must be strictly sorted without duplicates`, path);
    }
    previous = current;
  }
  return deepFreeze(values);
}

export function requireSortedProvenance(
  values: readonly CompiledContentProvenanceV1[],
  path: string,
): void {
  let previous: CompiledContentProvenanceV1 | undefined;
  for (const value of values) {
    if (previous !== undefined && compareProvenance(previous, value) >= 0) {
      throw invalidShape(`${path} must be strictly sorted without duplicates`, path);
    }
    previous = value;
  }
}

function compareProvenance(
  left: CompiledContentProvenanceV1,
  right: CompiledContentProvenanceV1,
): number {
  return (
    compareText(left.sourceId, right.sourceId) ||
    compareText(left.title, right.title) ||
    compareText(left.locator ?? "", right.locator ?? "")
  );
}
