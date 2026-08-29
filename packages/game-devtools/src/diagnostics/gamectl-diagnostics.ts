import type { ContentDiagnostic } from "@runtime-human/game-content-compiler";

export type StructuredDiagnosticV1 = Readonly<{
  schemaVersion: "runtime-human-diagnostic-v1";
  code: string;
  severity: "error" | "warning" | "info";
  category: "content" | "catalog" | "balance" | "scenario" | "environment";
  message: string;
  entityId?: string;
  path?: string;
  line?: number;
  column?: number;
  pointer?: string;
  invariant?: string;
  fixKind?: string;
}>;

export function toStructuredContentDiagnostic(
  diagnostic: ContentDiagnostic,
): StructuredDiagnosticV1 {
  return {
    schemaVersion: "runtime-human-diagnostic-v1",
    code: diagnostic.code,
    severity: "error",
    category: "content",
    message: diagnostic.message,
    ...(diagnostic.contentId === undefined ? {} : { entityId: diagnostic.contentId }),
    path: diagnostic.path,
    line: diagnostic.line,
    column: diagnostic.column,
    ...(diagnostic.pointer === undefined ? {} : { pointer: diagnostic.pointer }),
  };
}
