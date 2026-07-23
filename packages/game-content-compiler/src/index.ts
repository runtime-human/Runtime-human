import type { CompiledContentBundleV1 } from "@runtime-human/game-content";

export type ContentSourceFile = Readonly<{
  path: string;
  text: string;
}>;

export type ContentDiagnosticCode =
  | "JSONC_PARSE"
  | "SCHEMA_INVALID"
  | "DUPLICATE_ID"
  | "MISSING_REFERENCE"
  | "CHRONOLOGY_INVALID"
  | "UNREACHABLE_CONTENT";

export type ContentDiagnostic = Readonly<{
  code: ContentDiagnosticCode;
  message: string;
  path: string;
  line: number;
  column: number;
  contentId?: string;
}>;

export type CompileContentResult =
  | Readonly<{ kind: "success"; bundle: CompiledContentBundleV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly ContentDiagnostic[] }>;

export function compileContentSources(_files: readonly ContentSourceFile[]): CompileContentResult {
  throw new Error("Content compiler is not implemented");
}
