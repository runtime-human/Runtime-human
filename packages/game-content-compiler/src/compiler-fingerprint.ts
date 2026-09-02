import { fingerprint } from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";

export type CompilerFingerprintNamespaceV1 = "scenario-source-v1" | "scenario-program-v1";

export function fingerprintCompilerArtifactV1(
  namespace: CompilerFingerprintNamespaceV1,
  value: unknown,
): Fingerprint {
  return fingerprint(namespace, value);
}
