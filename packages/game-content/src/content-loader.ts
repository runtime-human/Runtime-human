import type {
  CompiledContentChunkV1,
  CompiledContentManifestV1,
} from "./compiled-content";
import {
  createCompiledContentValidators,
  type CompiledContentRuntimePrimitives,
} from "./compiled-content-runtime";
import {
  createContentRegistryWithValidators,
  type ContentRegistry,
} from "./content-registry";
import { selectJanuary1990ChunkIdsWithValidators } from "./select-required-chunks";

export type CompiledContentRuntime = Readonly<{
  parseCompiledContentManifest(json: string): CompiledContentManifestV1;
  parseCompiledContentChunk(json: string): CompiledContentChunkV1;
  selectJanuary1990ChunkIds(manifest: CompiledContentManifestV1): readonly string[];
  createContentRegistry(
    manifest: CompiledContentManifestV1,
    chunks: readonly CompiledContentChunkV1[],
    requiredChunkIds?: readonly string[],
  ): ContentRegistry;
}>;

export function createCompiledContentRuntime(
  primitives: CompiledContentRuntimePrimitives,
): CompiledContentRuntime {
  const validators = createCompiledContentValidators(primitives);
  return Object.freeze({
    parseCompiledContentManifest: validators.parseCompiledContentManifest,
    parseCompiledContentChunk: validators.parseCompiledContentChunk,
    selectJanuary1990ChunkIds(manifest: CompiledContentManifestV1): readonly string[] {
      return selectJanuary1990ChunkIdsWithValidators(validators, manifest);
    },
    createContentRegistry(
      manifest: CompiledContentManifestV1,
      chunks: readonly CompiledContentChunkV1[],
      requiredChunkIds?: readonly string[],
    ): ContentRegistry {
      return createContentRegistryWithValidators(
        validators,
        manifest,
        chunks,
        requiredChunkIds,
      );
    },
  });
}
