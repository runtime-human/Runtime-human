import type { AuthoritativeJsonValue, Fingerprint } from "@runtime-human/game-schema";

import type {
  CompiledContentChunkDescriptorV1,
  CompiledContentChunkV1,
  CompiledContentEntryV1,
  CompiledContentManifestV1,
  CompiledContentProvenanceV1,
  ContentKindV1,
} from "./compiled-content";
import { CompiledContentError } from "./content-errors";
import {
  requireManifestEntryPoints,
  requireSortedChunkDescriptors,
  requireSortedEntries,
  requireSortedProvenance,
  requireSortedUniqueStrings,
  requireUniqueManifestContentIds,
} from "./compiled-content-invariants";
import {
  deepFreeze,
  invalidShape,
  isFingerprint,
  parseCanonicalJsonArtifact,
  requireArray,
  requireBoolean,
  requireBoundedString,
  requireChunkId,
  requireChunkSegment,
  requireExactKeys,
  requireFingerprint,
  requireIdentifier,
  requireMonth,
  requireObject,
  requireString,
  validateJsonTree,
} from "./compiled-content-shape";

const MANIFEST_SCHEMA_VERSION = "compiled-content-manifest-v1";
const CHUNK_SCHEMA_VERSION = "compiled-content-chunk-v1";
const ENTRY_SCHEMA_VERSION = "compiled-content-entry-v1";
const COMPILER_VERSION = "content-compiler-v1";
const MAX_PROVENANCE_TITLE_LENGTH = 500;
const MAX_PROVENANCE_LOCATOR_LENGTH = 1_000;
const CONTENT_KINDS = new Set<ContentKindV1>(["event", "reference", "storylet", "technology"]);

export type CompiledContentRuntimePrimitives = Readonly<{
  canonicalize(value: unknown): string;
  fingerprint(namespace: string, value: unknown): Fingerprint;
}>;

export type CompiledContentValidators = Readonly<{
  parseCompiledContentManifest(json: string): CompiledContentManifestV1;
  parseCompiledContentChunk(json: string): CompiledContentChunkV1;
  validateCompiledContentManifest(value: unknown): CompiledContentManifestV1;
  validateCompiledContentChunk(value: unknown): CompiledContentChunkV1;
  readCandidateChunkId(value: unknown): string;
}>;

export function createCompiledContentValidators(
  primitives: CompiledContentRuntimePrimitives,
): CompiledContentValidators {
  if (
    typeof primitives.canonicalize !== "function" ||
    typeof primitives.fingerprint !== "function"
  ) {
    throw new TypeError(
      "Compiled content runtime primitives must provide canonicalize and fingerprint",
    );
  }

  const context = Object.freeze({ ...primitives });
  return Object.freeze({
    parseCompiledContentManifest(json: string): CompiledContentManifestV1 {
      return validateManifest(
        parseCanonicalJsonArtifact(json, "manifest", context.canonicalize),
        context,
      );
    },
    parseCompiledContentChunk(json: string): CompiledContentChunkV1 {
      return validateChunk(
        parseCanonicalJsonArtifact(json, "chunk", context.canonicalize),
        context,
      );
    },
    validateCompiledContentManifest(value: unknown): CompiledContentManifestV1 {
      return validateManifest(value, context);
    },
    validateCompiledContentChunk(value: unknown): CompiledContentChunkV1 {
      return validateChunk(value, context);
    },
    readCandidateChunkId(value: unknown): string {
      return requireChunkId(requireObject(value, "chunk").chunkId, "chunk.chunkId");
    },
  });
}

function validateManifest(
  value: unknown,
  context: CompiledContentRuntimePrimitives,
): CompiledContentManifestV1 {
  validateJsonTree(value, "manifest");
  const object = requireObject(value, "manifest");
  requireExactKeys(
    object,
    ["schemaVersion", "compilerVersion", "contentFingerprint", "entryPointIds", "chunks"],
    "manifest",
  );

  const schemaVersion = requireString(object.schemaVersion, "manifest.schemaVersion");
  if (schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw incompatibleVersion("compiled content manifest", schemaVersion, MANIFEST_SCHEMA_VERSION);
  }
  const compilerVersion = requireString(object.compilerVersion, "manifest.compilerVersion");
  if (compilerVersion !== COMPILER_VERSION) {
    throw incompatibleVersion("content compiler", compilerVersion, COMPILER_VERSION);
  }

  const entryPointIds = requireSortedUniqueStrings(object.entryPointIds, "manifest.entryPointIds");
  const chunks = requireArray(object.chunks, "manifest.chunks").map((item, index) =>
    validateChunkDescriptor(item, index),
  );
  requireSortedChunkDescriptors(chunks);
  requireUniqueManifestContentIds(chunks);
  requireManifestEntryPoints(entryPointIds, chunks);

  const contentFingerprint = requireFingerprint(
    object.contentFingerprint,
    "manifest.contentFingerprint",
  );
  const expectedFingerprint = computeFingerprint(context, MANIFEST_SCHEMA_VERSION, {
    compilerVersion,
    entryPointIds,
    chunks,
  });
  requireMatchingFingerprint(contentFingerprint, expectedFingerprint, "manifest");

  return deepFreeze({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    compilerVersion: COMPILER_VERSION,
    contentFingerprint,
    entryPointIds,
    chunks,
  });
}

function validateChunk(
  value: unknown,
  context: CompiledContentRuntimePrimitives,
): CompiledContentChunkV1 {
  validateJsonTree(value, "chunk");
  const object = requireObject(value, "chunk");
  requireExactKeys(
    object,
    ["schemaVersion", "chunkId", "era", "domain", "entries", "chunkFingerprint"],
    "chunk",
  );

  const schemaVersion = requireString(object.schemaVersion, "chunk.schemaVersion");
  if (schemaVersion !== CHUNK_SCHEMA_VERSION) {
    throw incompatibleVersion("compiled content chunk", schemaVersion, CHUNK_SCHEMA_VERSION);
  }

  const chunkId = requireChunkId(object.chunkId, "chunk.chunkId");
  const era = requireChunkSegment(object.era, "chunk.era");
  const domain = requireIdentifier(object.domain, "chunk.domain");
  if (chunkId !== `${era}/${domain}`) {
    throw invalidShape("chunk.chunkId must equal era/domain", "chunk.chunkId");
  }

  const entries = requireArray(object.entries, "chunk.entries").map((item, index) =>
    validateEntry(item, index),
  );
  requireSortedEntries(entries);
  for (const entry of entries) {
    if (entry.era !== era || entry.domain !== domain) {
      throw invalidShape(
        `Entry ${entry.id} does not belong to chunk ${chunkId}`,
        `chunk.entries.${entry.id}`,
      );
    }
  }

  const chunkFingerprint = requireFingerprint(object.chunkFingerprint, "chunk.chunkFingerprint");
  const core = {
    schemaVersion: CHUNK_SCHEMA_VERSION,
    chunkId,
    era,
    domain,
    entries,
  } as const;
  const expectedFingerprint = computeFingerprint(context, CHUNK_SCHEMA_VERSION, core);
  requireMatchingFingerprint(chunkFingerprint, expectedFingerprint, chunkId);
  return deepFreeze({ ...core, chunkFingerprint });
}

function validateChunkDescriptor(value: unknown, index: number): CompiledContentChunkDescriptorV1 {
  const path = `manifest.chunks[${index}]`;
  const object = requireObject(value, path);
  requireExactKeys(object, ["chunkId", "era", "domain", "contentIds", "chunkFingerprint"], path);
  const chunkId = requireChunkId(object.chunkId, `${path}.chunkId`);
  const era = requireChunkSegment(object.era, `${path}.era`);
  const domain = requireIdentifier(object.domain, `${path}.domain`);
  if (chunkId !== `${era}/${domain}`) {
    throw invalidShape(`${path}.chunkId must equal era/domain`, `${path}.chunkId`);
  }
  return deepFreeze({
    chunkId,
    era,
    domain,
    contentIds: requireSortedUniqueStrings(object.contentIds, `${path}.contentIds`),
    chunkFingerprint: requireFingerprint(object.chunkFingerprint, `${path}.chunkFingerprint`),
  });
}

function validateEntry(value: unknown, index: number): CompiledContentEntryV1 {
  const path = `chunk.entries[${index}]`;
  const object = requireObject(value, path);
  const requiredKeys = [
    "schemaVersion",
    "id",
    "kind",
    "domain",
    "era",
    "availableFrom",
    "entryPoint",
    "references",
    "provenance",
    "payload",
  ];
  requireExactKeys(
    object,
    object.availableTo === undefined ? requiredKeys : [...requiredKeys, "availableTo"],
    path,
  );

  const schemaVersion = requireString(object.schemaVersion, `${path}.schemaVersion`);
  if (schemaVersion !== ENTRY_SCHEMA_VERSION) {
    throw incompatibleVersion("compiled content entry", schemaVersion, ENTRY_SCHEMA_VERSION);
  }
  const kind = requireString(object.kind, `${path}.kind`);
  if (!CONTENT_KINDS.has(kind as ContentKindV1)) {
    throw invalidShape(`Unsupported content kind: ${kind}`, `${path}.kind`);
  }

  const provenanceValues = requireArray(object.provenance, `${path}.provenance`);
  if (provenanceValues.length === 0) {
    throw invalidShape(`${path}.provenance must contain at least one source`, `${path}.provenance`);
  }
  const provenance = provenanceValues.map((item, provenanceIndex) =>
    validateProvenance(item, `${path}.provenance[${provenanceIndex}]`),
  );
  requireSortedProvenance(provenance, `${path}.provenance`);

  const base = {
    schemaVersion: ENTRY_SCHEMA_VERSION,
    id: requireIdentifier(object.id, `${path}.id`),
    kind: kind as ContentKindV1,
    domain: requireIdentifier(object.domain, `${path}.domain`),
    era: requireChunkSegment(object.era, `${path}.era`),
    availableFrom: requireMonth(object.availableFrom, `${path}.availableFrom`),
    entryPoint: requireBoolean(object.entryPoint, `${path}.entryPoint`),
    references: requireSortedUniqueStrings(object.references, `${path}.references`),
    provenance,
    payload: object.payload as AuthoritativeJsonValue,
  } as const;

  if (object.availableTo === undefined) return deepFreeze(base);
  const availableTo = requireMonth(object.availableTo, `${path}.availableTo`);
  if (availableTo < base.availableFrom) {
    throw invalidShape(`${path}.availableTo precedes availableFrom`, `${path}.availableTo`);
  }
  return deepFreeze({ ...base, availableTo });
}

function validateProvenance(value: unknown, path: string): CompiledContentProvenanceV1 {
  const object = requireObject(value, path);
  requireExactKeys(
    object,
    object.locator === undefined ? ["sourceId", "title"] : ["sourceId", "title", "locator"],
    path,
  );
  const base = {
    sourceId: requireIdentifier(object.sourceId, `${path}.sourceId`),
    title: requireBoundedString(object.title, `${path}.title`, MAX_PROVENANCE_TITLE_LENGTH),
  };
  if (object.locator === undefined) return deepFreeze(base);
  return deepFreeze({
    ...base,
    locator: requireBoundedString(object.locator, `${path}.locator`, MAX_PROVENANCE_LOCATOR_LENGTH),
  });
}

function computeFingerprint(
  context: CompiledContentRuntimePrimitives,
  namespace: string,
  value: AuthoritativeJsonValue,
): Fingerprint {
  let result: Fingerprint;
  try {
    result = context.fingerprint(namespace, value);
  } catch {
    throw invalidShape("Compiled content fingerprint calculation failed", "fingerprint");
  }
  if (!isFingerprint(result)) {
    throw invalidShape(
      "Compiled content fingerprint primitive returned an invalid value",
      "fingerprint",
    );
  }
  return result;
}

function requireMatchingFingerprint(
  actual: Fingerprint,
  expected: Fingerprint,
  artifact: string,
): void {
  if (actual !== expected) {
    throw new CompiledContentError(
      "FINGERPRINT_MISMATCH",
      `Compiled content fingerprint mismatch for ${artifact}`,
      { actual, artifact, expected },
    );
  }
}

function incompatibleVersion(
  subject: string,
  actual: string,
  expected: string,
): CompiledContentError {
  return new CompiledContentError(
    "INCOMPATIBLE_VERSION",
    `Unsupported ${subject} version: ${actual}`,
    { actual, expected },
  );
}
