import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CompiledContentError,
  createContentRegistry,
  parseCompiledContentChunk,
  parseCompiledContentManifest,
  selectJanuary1990ChunkIds,
} from "@runtime-human/game-content";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

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
  return { manifest, chunkIds, chunks, registry: createContentRegistry(manifest, chunks) };
}

describe("compiled content runtime loader", () => {
  it("loads only the required January chunks into an immutable registry", async () => {
    const { chunkIds, registry } = await loadJanuaryRegistry();

    expect(chunkIds).toEqual(["1990s/ecosystem", "1990s/programming"]);
    expect(registry.require("core.technology.gw-basic")).toMatchObject({
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
    expect(Object.isFrozen(registry.require("core.event.access-window"))).toBe(true);
  });

  it("rejects incompatible, malformed and corrupt compiled artifacts", async () => {
    const manifestJson = await readArtifact("manifest.json");
    const chunkJson = await readArtifact("chunks/1990s/programming.json");

    expect(() =>
      parseCompiledContentManifest(
        manifestJson.replace("compiled-content-manifest-v1", "compiled-content-manifest-v2"),
      ),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "INCOMPATIBLE_VERSION" }));
    expect(() => parseCompiledContentManifest("{ broken")).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "INVALID_JSON" }),
    );
    expect(() =>
      parseCompiledContentChunk(chunkJson.replace('"eventType":"logic-error"', '"eventType":"changed"')),
    ).toThrow(expect.objectContaining<Partial<CompiledContentError>>({ code: "FINGERPRINT_MISMATCH" }));
  });

  it("rejects missing and unexpected chunks before registry publication", async () => {
    const manifest = parseCompiledContentManifest(await readArtifact("manifest.json"));
    const ecosystem = parseCompiledContentChunk(
      await readArtifact("chunks/1990s/ecosystem.json"),
    );

    expect(() => createContentRegistry(manifest, [ecosystem])).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "MISSING_CHUNK" }),
    );
    expect(() => createContentRegistry(manifest, [ecosystem, { ...ecosystem, chunkId: "1990s/extra" }])).toThrow(
      expect.objectContaining<Partial<CompiledContentError>>({ code: "UNEXPECTED_CHUNK" }),
    );
  });
});
