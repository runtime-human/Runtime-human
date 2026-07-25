import type { CompiledContentManifestV1 } from "./compiled-content";
import { CompiledContentError } from "./content-errors";
import type { CompiledContentValidators } from "./compiled-content-runtime";

const JANUARY_1990_CHUNK_IDS = Object.freeze([
  "1990s/ecosystem",
  "1990s/programming",
] as const);

export function selectJanuary1990ChunkIdsWithValidators(
  validators: CompiledContentValidators,
  manifestValue: CompiledContentManifestV1,
): readonly string[] {
  const manifest = validators.validateCompiledContentManifest(manifestValue);
  const descriptors = new Map(
    manifest.chunks.map((descriptor) => [descriptor.chunkId, descriptor]),
  );
  for (const chunkId of JANUARY_1990_CHUNK_IDS) {
    if (!descriptors.has(chunkId)) {
      throw new CompiledContentError(
        "MISSING_CHUNK",
        `Required January 1990 content chunk is missing: ${chunkId}`,
        { chunkId },
      );
    }
  }
  return JANUARY_1990_CHUNK_IDS;
}
