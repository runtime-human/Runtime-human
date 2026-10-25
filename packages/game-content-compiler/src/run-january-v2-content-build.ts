import { resolve } from "node:path";

import { assertIsolatedContentBuildNamespaces } from "./content-build-config";
import { assertJanuaryV2PresentationSource } from "./january-v2-presentation-source";
import { loadContentSourceFiles } from "./load-content-source-files";
import {
  runIsolatedContentBuild,
  type RunIsolatedContentBuildOptions,
} from "./run-isolated-content-build";
import type { ContentBuildResult } from "./run-content-build";

/**
 * Entry point for the separately authored January v2 presentation.
 * Authoring semantics are checked before invoking the fail-closed publisher.
 * This remains inactive for production MonthRun and UI.
 */
export async function runJanuaryV2ContentBuild(
  options: RunIsolatedContentBuildOptions,
): Promise<ContentBuildResult> {
  assertIsolatedContentBuildNamespaces(options.legacyConfig, options.additionalConfig);
  const files = await loadContentSourceFiles({
    repositoryRoot: resolve(options.repositoryRoot),
    sourceRoots: options.additionalConfig.sourceRoots,
  });
  assertJanuaryV2PresentationSource(files);
  return runIsolatedContentBuild(options);
}
