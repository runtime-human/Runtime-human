import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";

import { CompiledContentError, createCompiledContentRuntime } from "@runtime-human/game-content";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

const CONTENT_RUNTIME = createCompiledContentRuntime({
  canonicalize: canonicalizeAuthoritative,
  fingerprint,
});
const {
  createContentRegistry,
  parseCompiledContentChunk,
  parseCompiledContentManifest,
  selectJanuary1990ChunkIds,
} = CONTENT_RUNTIME;

async function readArtifact(path: string): Promise<string> {
  return readFile(join(CONTENT_ROOT, ...path.split("/")), "utf8");
}

async function loadJanuaryRegistry() {
  const manifest = parseCompiledContentManifest(await readArtifact("manifest.json"));
  const chunkIds = selectJanuary1990ChunkIds(manifest);
  const chunks = await Promise.all(
    chunkIds.map(async (chunkId) =>
      parseCompiledContentChunk(await readArtifact(`chunks/${chunkId}.json`)),
    ),
  );
  return {
    manifest,
    chunkIds,
    chunks,
    registry: createContentRegistry(manifest, chunks, chunkIds),
  };
}

describe("compiled content runtime loader", () => {
  it("loads only the required January chunks into an immutable registry", async () => {
    const { chunkIds, registry } = await loadJanuaryRegistry();

    expect(chunkIds).toEqual(["1990s/ecosystem", "1990s/programming"]);
    expect(registry.get("core.technology.gw-basic")).toMatchObject({
      id: "core.technology.gw-basic",
      kind: "technology",
    });
    expect(registry.listByKind("event").map((entry) => entry.id)).toEqual([
      "core.event.access-window",
      "core.event.logic-error",
      "core.event.manual-found",
      "core.event.program-runs",
      "core.event.syntax-error",
    ]);
    expect(registry.get("core.missing")).toBeUndefined();
    expect(Object.isFrozen(registry.require("core.event.access-window"))).toBe(true);
    expect(Object.isFrozen(registry.listByKind("event"))).toBe(true);
  });

  it("loads a verified required subset when the manifest also declares future chunks", async () => {
    const { manifest, chunkIds, chunks } = await loadJanuaryRegistry();
    const futureChunkCore = {
      schemaVersion: "compiled-content-chunk-v1" as const,
      chunkId: "2000s/programming",
      era: "2000s",
      domain: "programming",
      entries: [],
    };
    const futureChunk = {
      ...futureChunkCore,
      chunkFingerprint: fingerprint("compiled-content-chunk-v1", futureChunkCore),
    };
    const futureDescriptor = {
      chunkId: futureChunk.chunkId,
      era: futureChunk.era,
      domain: futureChunk.domain,
      contentIds: [],
      chunkFingerprint: futureChunk.chunkFingerprint,
    };
    const manifestCore = {
      compilerVersion: manifest.compilerVersion,
      entryPointIds: manifest.entryPointIds,
      chunks: [...manifest.chunks, futureDescriptor],
    };
    const futureManifest = {
      schemaVersion: manifest.schemaVersion,
      ...manifestCore,
      contentFingerprint: fingerprint("compiled-content-manifest-v1", manifestCore),
    };

    const registry = createContentRegistry(futureManifest, chunks, chunkIds);

    expect(registry.require("core.technology.gw-basic").id).toBe("core.technology.gw-basic");
    expect(() => createContentRegistry(futureManifest, chunks)).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "MISSING_CHUNK" }),
    );
  });

  it("rejects incompatible, malformed and corrupt compiled artifacts", async () => {
    const manifestJson = await readArtifact("manifest.json");
    const chunkJson = await readArtifact("chunks/1990s/programming.json");

    expect(() =>
      parseCompiledContentManifest(
        manifestJson.replace("compiled-content-manifest-v1", "compiled-content-manifest-v2"),
      ),
    ).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "INCOMPATIBLE_VERSION" }),
    );
    expect(() => parseCompiledContentManifest("{ broken")).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "INVALID_JSON" }),
    );
    expect(() =>
      parseCompiledContentChunk(
        chunkJson.replace('"eventType":"logic-error"', '"eventType":"changed"'),
      ),
    ).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "FINGERPRINT_MISMATCH" }),
    );
  });

  it("enforces closed artifact shapes and authoritative JSON bounds", async () => {
    const chunkJson = await readArtifact("chunks/1990s/programming.json");

    expect(() =>
      parseCompiledContentChunk(
        chunkJson.replace('"eventType":"logic-error"', '"eventType":9007199254740992'),
      ),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "INVALID_SHAPE" }));
    expect(() =>
      parseCompiledContentChunk(
        chunkJson.replace('"chunkFingerprint"', '"sourcePath":"authoring-only","chunkFingerprint"'),
      ),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "INVALID_SHAPE" }));
    expect(() =>
      parseCompiledContentChunk(
        chunkJson.replace('"core.skill.debugging"', '"Core.skill.debugging"'),
      ),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "INVALID_SHAPE" }));

    const manifestJson = await readArtifact("manifest.json");
    expect(() =>
      parseCompiledContentManifest(
        manifestJson.replace(
          '"compilerVersion":"content-compiler-v1"',
          '"compilerVersion":"content-compiler-v1","compilerVersion":"content-compiler-v1"',
        ),
      ),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "INVALID_SHAPE" }));

    const manifest = parseCompiledContentManifest(manifestJson);
    const duplicateContentId = manifest.chunks[0]!.contentIds[0]!;
    const duplicateDescriptor = {
      ...manifest.chunks[1]!,
      contentIds: [...manifest.chunks[1]!.contentIds, duplicateContentId].toSorted(),
    };
    const duplicateManifestCore = {
      compilerVersion: manifest.compilerVersion,
      entryPointIds: manifest.entryPointIds,
      chunks: [manifest.chunks[0]!, duplicateDescriptor],
    };
    const duplicateManifest = {
      schemaVersion: manifest.schemaVersion,
      ...duplicateManifestCore,
      contentFingerprint: fingerprint("compiled-content-manifest-v1", duplicateManifestCore),
    };
    expect(() =>
      parseCompiledContentManifest(`${canonicalizeAuthoritative(duplicateManifest)}\n`),
    ).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({
        code: "DUPLICATE_CONTENT_ID",
      }),
    );
  });

  it("rejects duplicate chunks and closed-registry lookup misses", async () => {
    const { manifest, chunks, registry } = await loadJanuaryRegistry();

    expect(() => createContentRegistry(manifest, [...chunks, chunks[0]!])).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "DUPLICATE_CHUNK" }),
    );
    expect(() => registry.require("core.missing")).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "CONTENT_NOT_FOUND" }),
    );
  });

  it("rejects missing and unexpected chunks before registry publication", async () => {
    const manifest = parseCompiledContentManifest(await readArtifact("manifest.json"));
    const ecosystem = parseCompiledContentChunk(await readArtifact("chunks/1990s/ecosystem.json"));

    expect(() => createContentRegistry(manifest, [ecosystem])).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "MISSING_CHUNK" }),
    );
    expect(() =>
      createContentRegistry(manifest, [ecosystem, { ...ecosystem, chunkId: "1990s/extra" }]),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "UNEXPECTED_CHUNK" }));
  });
});
