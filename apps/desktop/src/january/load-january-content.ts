import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";
import { createCompiledContentRuntime, type ContentRegistry } from "@runtime-human/game-content";

import {
  NOOP_PERFORMANCE_RECORDER,
  type PerformanceRecorder,
} from "../performance/performance-recorder";

export type JanuaryContentFetchPort = (
  input: string,
  init?: Readonly<{ cache?: RequestCache }>,
) => Promise<Readonly<{ ok: boolean; status: number; text(): Promise<string> }>>;

const CONTENT_RUNTIME = createCompiledContentRuntime({
  canonicalize: canonicalizeAuthoritative,
  fingerprint,
});

export async function loadJanuaryContentRegistry(
  fetchContent: JanuaryContentFetchPort,
  performance: PerformanceRecorder = NOOP_PERFORMANCE_RECORDER,
): Promise<ContentRegistry> {
  const manifest = await performance.measure("content.manifest", async () =>
    CONTENT_RUNTIME.parseCompiledContentManifest(
      await fetchText(fetchContent, "/content/manifest.json"),
    ),
  );
  const requiredChunkIds = CONTENT_RUNTIME.selectJanuary1990ChunkIds(manifest);
  const chunks = await Promise.all(
    requiredChunkIds.map(async (chunkId) =>
      performance.measure("content.chunk", async () =>
        CONTENT_RUNTIME.parseCompiledContentChunk(
          await fetchText(fetchContent, `/content/chunks/${chunkPath(chunkId)}.json`),
        ),
      ),
    ),
  );
  return performance.measure("content.registry", async () =>
    CONTENT_RUNTIME.createContentRegistry(manifest, chunks, requiredChunkIds),
  );
}

async function fetchText(fetchContent: JanuaryContentFetchPort, url: string): Promise<string> {
  const response = await fetchContent(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить игровой контент ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

function chunkPath(chunkId: string): string {
  return chunkId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
