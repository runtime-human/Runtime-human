import { resolve } from "node:path";

import type { ContentDiagnostic } from "./content-diagnostics";
import { parseContentBuildConfig, type ContentBuildConfig } from "./content-build-config";
import { compileContentSources } from "./compile-content-sources";
import { loadContentSourceFiles } from "./load-content-source-files";
import { resolveRepositoryPath } from "./repository-path";
import { checkContentArtifacts, writeContentArtifacts } from "./write-content-artifacts";

export type ContentBuildMode = "check" | "write";

export type RunContentBuildOptions = Readonly<{
  repositoryRoot: string;
  config: ContentBuildConfig;
  mode: ContentBuildMode;
}>;

export type ContentBuildResult =
  | Readonly<{ kind: "written"; artifactCount: number }>
  | Readonly<{ kind: "current"; artifactCount: number }>
  | Readonly<{ kind: "outdated"; differences: readonly string[] }>
  | Readonly<{ kind: "content-invalid"; diagnostics: readonly ContentDiagnostic[] }>;

export async function runContentBuild(
  options: RunContentBuildOptions,
): Promise<ContentBuildResult> {
  const repositoryRoot = resolve(options.repositoryRoot);
  const config = parseContentBuildConfig(options.config);
  const sourceFiles = await loadContentSourceFiles({
    repositoryRoot,
    sourceRoots: config.sourceRoots,
  });
  const compilation = compileContentSources(sourceFiles);
  if (compilation.kind === "failure") {
    return { kind: "content-invalid", diagnostics: compilation.diagnostics };
  }

  const outputRoot = await resolveRepositoryPath(
    repositoryRoot,
    config.outputRoot,
    "Compiled content output root",
  );
  const artifacts = compilation.bundle.artifacts;
  if (options.mode === "write") {
    await writeContentArtifacts({ outputRoot, artifacts });
    return { kind: "written", artifactCount: artifacts.length };
  }

  const check = await checkContentArtifacts({ outputRoot, artifacts });
  return check.current
    ? { kind: "current", artifactCount: artifacts.length }
    : { kind: "outdated", differences: check.differences };
}
