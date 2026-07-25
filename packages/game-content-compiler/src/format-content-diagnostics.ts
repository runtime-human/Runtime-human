import { compareDiagnostics, type ContentDiagnostic } from "./content-diagnostics";

export function formatContentDiagnostics(
  diagnostics: readonly ContentDiagnostic[],
): readonly string[] {
  return diagnostics
    .toSorted(compareDiagnostics)
    .map(
      (diagnostic) =>
        `${diagnostic.path}:${diagnostic.line}:${diagnostic.column} ${diagnostic.code} ${diagnostic.message}`,
    );
}
