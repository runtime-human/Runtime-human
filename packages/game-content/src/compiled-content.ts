import type { AuthoritativeJsonValue, Fingerprint } from "@runtime-human/game-schema";

export type ContentKindV1 = "event" | "reference" | "storylet" | "technology";

export type CompiledContentProvenanceV1 = Readonly<{
  sourceId: string;
  title: string;
  locator?: string;
}>;

export type CompiledContentEntryV1 = Readonly<{
  schemaVersion: "compiled-content-entry-v1";
  id: string;
  kind: ContentKindV1;
  domain: string;
  era: string;
  availableFrom: string;
  availableTo?: string;
  entryPoint: boolean;
  references: readonly string[];
  provenance: readonly CompiledContentProvenanceV1[];
  payload: AuthoritativeJsonValue;
}>;

export type CompiledContentChunkV1 = Readonly<{
  schemaVersion: "compiled-content-chunk-v1";
  chunkId: string;
  era: string;
  domain: string;
  entries: readonly CompiledContentEntryV1[];
  chunkFingerprint: Fingerprint;
}>;

export type CompiledContentChunkDescriptorV1 = Readonly<{
  chunkId: string;
  era: string;
  domain: string;
  contentIds: readonly string[];
  chunkFingerprint: Fingerprint;
}>;

export type CompiledContentManifestV1 = Readonly<{
  schemaVersion: "compiled-content-manifest-v1";
  compilerVersion: "content-compiler-v1";
  contentFingerprint: Fingerprint;
  entryPointIds: readonly string[];
  chunks: readonly CompiledContentChunkDescriptorV1[];
}>;

export type CompiledContentArtifactV1 = Readonly<{
  path: string;
  json: string;
}>;

export type CompiledContentBundleV1 = Readonly<{
  manifest: CompiledContentManifestV1;
  chunks: readonly CompiledContentChunkV1[];
  artifacts: readonly CompiledContentArtifactV1[];
}>;
