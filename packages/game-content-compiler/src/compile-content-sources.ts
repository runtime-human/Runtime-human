import { buildContentBundle } from "./build-content-bundle";
import { compareDiagnostics, type ContentDiagnostic } from "./content-diagnostics";
import { parseContentSources } from "./parse-content-sources";
import type { CompileContentResult, ContentSourceFile } from "./content-types";
import {
  validateOwnChronology,
  validateReachability,
  validateReferences,
  validateUniqueIds,
} from "./validate-content-graph";

export function compileContentSources(files: readonly ContentSourceFile[]): CompileContentResult {
  const diagnostics: ContentDiagnostic[] = [];
  const parsed = parseContentSources(files, diagnostics);
  const uniqueDocuments = validateUniqueIds(parsed, diagnostics);

  validateOwnChronology(uniqueDocuments, diagnostics);
  validateReferences(uniqueDocuments, diagnostics);
  if (uniqueDocuments.length > 0 || files.length === 0) {
    validateReachability(uniqueDocuments, diagnostics);
  }

  if (diagnostics.length > 0) {
    return { kind: "failure", diagnostics: diagnostics.toSorted(compareDiagnostics) };
  }

  return { kind: "success", bundle: buildContentBundle(uniqueDocuments) };
}
