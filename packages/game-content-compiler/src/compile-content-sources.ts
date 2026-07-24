import { buildContentBundle } from "./build-content-bundle";
import {
  compareDiagnostics,
  createContentSetDiagnostic,
  type ContentDiagnostic,
} from "./content-diagnostics";
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
  if (diagnostics.length === 0) {
    validateReachability(uniqueDocuments, diagnostics);
  }

  if (diagnostics.length > 0) {
    return { kind: "failure", diagnostics: diagnostics.toSorted(compareDiagnostics) };
  }

  try {
    return { kind: "success", bundle: buildContentBundle(uniqueDocuments) };
  } catch (error) {
    if (error instanceof RangeError && error.message.startsWith("Authoritative value exceeds ")) {
      return {
        kind: "failure",
        diagnostics: [
          createContentSetDiagnostic(
            "CONTENT_LIMIT_EXCEEDED",
            `Compiled content exceeds authoritative limits: ${error.message}`,
          ),
        ],
      };
    }
    throw error;
  }
}
