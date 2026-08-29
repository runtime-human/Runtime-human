import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  loadContentSourceFiles,
  parseContentBuildConfig,
  projectContentCatalog,
  type ContentCatalogEntryV1,
} from "@runtime-human/game-content-compiler";

import {
  toStructuredContentDiagnostic,
  type StructuredDiagnosticV1,
} from "../diagnostics/gamectl-diagnostics";

const DEFAULT_CONFIG_PATH = "content/content.config.json";

export type ContentCatalog = Readonly<{
  repositoryRoot: string;
  entries: readonly ContentCatalogEntryV1[];
}>;

export type LoadedContentCatalog =
  | Readonly<{ kind: "success"; catalog: ContentCatalog }>
  | Readonly<{ kind: "failure"; diagnostics: readonly StructuredDiagnosticV1[] }>;

export async function loadContentCatalog(
  options: Readonly<{ repositoryRoot: string; configPath?: string }>,
): Promise<LoadedContentCatalog> {
  const repositoryRoot = resolve(options.repositoryRoot);
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const config = await readBuildConfig(repositoryRoot, configPath);
  if (config.kind === "failure") return config;

  let buildConfig: ReturnType<typeof parseContentBuildConfig>;
  try {
    buildConfig = parseContentBuildConfig(config.value);
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        kind: "failure",
        diagnostics: [configDiagnostic("CONFIG_INVALID", error.message, configPath)],
      };
    }
    throw error;
  }

  try {
    const files = await loadContentSourceFiles({
      repositoryRoot,
      sourceRoots: buildConfig.sourceRoots,
    });
    const projection = projectContentCatalog(files);
    if (projection.kind === "failure") {
      return {
        kind: "failure",
        diagnostics: projection.diagnostics.map(toStructuredContentDiagnostic),
      };
    }
    return { kind: "success", catalog: { repositoryRoot, entries: projection.entries } };
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        kind: "failure",
        diagnostics: [sourceRootDiagnostic("SOURCE_ROOT_INVALID", error.message)],
      };
    }
    throw error;
  }
}

type BuildConfigReadResult =
  | Readonly<{ kind: "ok"; value: unknown }>
  | Readonly<{ kind: "failure"; diagnostics: readonly StructuredDiagnosticV1[] }>;

async function readBuildConfig(
  repositoryRoot: string,
  configPath: string,
): Promise<BuildConfigReadResult> {
  let text: string;
  try {
    text = await readFile(join(repositoryRoot, ...configPath.split("/")), "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        kind: "failure",
        diagnostics: [
          configDiagnostic(
            "CONFIG_MISSING",
            `Content build config is missing: ${configPath}`,
            configPath,
          ),
        ],
      };
    }
    return {
      kind: "failure",
      diagnostics: [configDiagnostic("CONFIG_INVALID", readErrorMessage(error), configPath)],
    };
  }

  try {
    return { kind: "ok", value: JSON.parse(stripByteOrderMark(text)) as unknown };
  } catch (error) {
    return {
      kind: "failure",
      diagnostics: [
        configDiagnostic(
          "CONFIG_INVALID",
          `Content build config is not valid JSON: ${readErrorMessage(error)}`,
          configPath,
        ),
      ],
    };
  }
}

function configDiagnostic(code: string, message: string, path: string): StructuredDiagnosticV1 {
  return {
    schemaVersion: "runtime-human-diagnostic-v1",
    code,
    severity: "error",
    category: "content",
    message,
    path,
  };
}

function sourceRootDiagnostic(code: string, message: string): StructuredDiagnosticV1 {
  return {
    schemaVersion: "runtime-human-diagnostic-v1",
    code,
    severity: "error",
    category: "content",
    message,
  };
}

function stripByteOrderMark(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ code?: unknown }>).code === "ENOENT"
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown content build config error";
}
