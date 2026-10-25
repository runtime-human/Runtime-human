import {
  assertIsolatedContentBuildNamespaces,
  type ContentBuildConfig,
} from "./content-build-config";
import {
  runContentBuild,
  type ContentBuildMode,
  type ContentBuildResult,
} from "./run-content-build";

/**
 * The v2 publisher must verify the deployed v1 bundle before writing into its
 * own disjoint namespace. This wrapper never writes, repairs, or rebuilds v1.
 * Its namespace preflight runs before either tree is read or mutated.
 */
export type RunIsolatedContentBuildOptions = Readonly<{
  repositoryRoot: string;
  legacyConfig: ContentBuildConfig;
  additionalConfig: ContentBuildConfig;
  mode: ContentBuildMode;
}>;

export async function runIsolatedContentBuild(
  options: RunIsolatedContentBuildOptions,
): Promise<ContentBuildResult> {
  assertIsolatedContentBuildNamespaces(options.legacyConfig, options.additionalConfig);

  const legacyCheck = await runContentBuild({
    repositoryRoot: options.repositoryRoot,
    config: options.legacyConfig,
    mode: "check",
  });
  if (legacyCheck.kind !== "current") {
    throw new TypeError(
      `Refusing isolated content build: legacy published artifacts are ${legacyCheck.kind}`,
    );
  }

  return runContentBuild({
    repositoryRoot: options.repositoryRoot,
    config: options.additionalConfig,
    mode: options.mode,
  });
}
