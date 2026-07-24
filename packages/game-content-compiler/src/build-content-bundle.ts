import type {
  CompiledContentArtifactV1,
  CompiledContentBundleV1,
  CompiledContentChunkDescriptorV1,
  CompiledContentChunkV1,
  CompiledContentEntryV1,
  CompiledContentManifestV1,
  CompiledContentProvenanceV1,
} from "@runtime-human/game-content";
import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";

import { CONTENT_COMPILER_VERSION } from "./content-source-schema";
import {
  compareText,
  type ContentSourceDocumentV1,
  type ParsedContentDocument,
} from "./content-types";

export function buildContentBundle(
  documents: readonly ParsedContentDocument[],
): CompiledContentBundleV1 {
  const entries = documents.map(({ source }) => normalizeEntry(source));
  const chunks = buildChunks(entries);
  const descriptors: CompiledContentChunkDescriptorV1[] = chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    era: chunk.era,
    domain: chunk.domain,
    contentIds: chunk.entries.map((entry) => entry.id),
    chunkFingerprint: chunk.chunkFingerprint,
  }));
  const entryPointIds = entries
    .filter((entry) => entry.entryPoint)
    .map((entry) => entry.id)
    .toSorted(compareText);
  const contentFingerprint = fingerprint("compiled-content-manifest-v1", {
    compilerVersion: CONTENT_COMPILER_VERSION,
    entryPointIds,
    chunks: descriptors,
  });
  const manifest: CompiledContentManifestV1 = {
    schemaVersion: "compiled-content-manifest-v1",
    compilerVersion: CONTENT_COMPILER_VERSION,
    contentFingerprint,
    entryPointIds,
    chunks: descriptors,
  };
  const artifacts: CompiledContentArtifactV1[] = [
    ...chunks.map((chunk) => ({
      path: `chunks/${chunk.chunkId}.json`,
      json: `${canonicalizeAuthoritative(chunk)}\n`,
    })),
    {
      path: "manifest.json",
      json: `${canonicalizeAuthoritative(manifest)}\n`,
    },
  ].toSorted((left, right) => compareText(left.path, right.path));

  return { manifest, chunks, artifacts };
}

function normalizeEntry(source: ContentSourceDocumentV1): CompiledContentEntryV1 {
  const base = {
    schemaVersion: "compiled-content-entry-v1" as const,
    id: source.id,
    kind: source.kind,
    domain: source.domain,
    era: source.era,
    availableFrom: source.availableFrom,
    entryPoint: source.entryPoint,
    references: source.references.toSorted(compareText),
    provenance: source.provenance.map((item) => ({ ...item })).toSorted(compareProvenance),
    payload: source.payload,
  };
  return source.availableTo === undefined ? base : { ...base, availableTo: source.availableTo };
}

function buildChunks(entries: readonly CompiledContentEntryV1[]): CompiledContentChunkV1[] {
  const groups = new Map<string, CompiledContentEntryV1[]>();
  for (const entry of entries) {
    const chunkId = `${entry.era}/${entry.domain}`;
    const group = groups.get(chunkId) ?? [];
    group.push(entry);
    groups.set(chunkId, group);
  }

  return [...groups.entries()]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([chunkId, group]) => {
      const sortedEntries = group.toSorted((left, right) => compareText(left.id, right.id));
      const [era, domain] = chunkId.split("/");
      if (era === undefined || domain === undefined) {
        throw new Error(`Invalid compiler-owned chunk ID ${chunkId}`);
      }
      const core = {
        schemaVersion: "compiled-content-chunk-v1" as const,
        chunkId,
        era,
        domain,
        entries: sortedEntries,
      };
      return {
        ...core,
        chunkFingerprint: fingerprint("compiled-content-chunk-v1", core),
      };
    });
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
