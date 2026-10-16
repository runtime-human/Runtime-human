import type { CompiledContentBundleV1 } from "@runtime-human/game-content";

import { compareText } from "./content-types";

export type ProtectedContentChunkDrift = Readonly<{
  chunkId: string;
  reason: "baseline-missing" | "candidate-missing" | "bytes-changed";
}>;

export type ContentCompatibilityInspection = Readonly<{
  /** Root manifest fingerprint can change even when all protected chunks survive. */
  manifestFingerprintChanged: boolean;
  protectedChunksPreserved: boolean;
  drifts: readonly ProtectedContentChunkDrift[];
}>;

/**
 * REF-02B0: compare exact published chunk artifact bytes, not merely stable IDs.
 * A passing protected-chunk comparison does NOT imply that the legacy manifest
 * fingerprint, or a persisted checkpoint depending on it, is compatible.
 */
export function inspectProtectedContentChunks(
  baseline: CompiledContentBundleV1,
  candidate: CompiledContentBundleV1,
  protectedChunkIds: readonly string[],
): ContentCompatibilityInspection {
  const drifts: ProtectedContentChunkDrift[] = [];
  const baselineArtifacts = new Map(baseline.artifacts.map((item) => [item.path, item.json]));
  const candidateArtifacts = new Map(candidate.artifacts.map((item) => [item.path, item.json]));

  for (const chunkId of [...new Set(protectedChunkIds)].toSorted(compareText)) {
    const path = `chunks/${chunkId}.json`;
    const baselineJson = baselineArtifacts.get(path);
    const candidateJson = candidateArtifacts.get(path);
    if (baselineJson === undefined) {
      drifts.push({ chunkId, reason: "baseline-missing" });
    } else if (candidateJson === undefined) {
      drifts.push({ chunkId, reason: "candidate-missing" });
    } else if (baselineJson !== candidateJson) {
      drifts.push({ chunkId, reason: "bytes-changed" });
    }
  }

  return {
    manifestFingerprintChanged:
      baseline.manifest.contentFingerprint !== candidate.manifest.contentFingerprint,
    protectedChunksPreserved: drifts.length === 0,
    drifts,
  };
}
