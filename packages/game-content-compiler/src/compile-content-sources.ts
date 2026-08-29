import { buildContentBundle } from "./build-content-bundle";
import {
  compareDiagnostics,
  createContentSetDiagnostic,
  type ContentDiagnostic,
} from "./content-diagnostics";
import { parseContentSources } from "./parse-content-sources";
import type {
  CompileContentResult,
  ContentSourceFile,
  ParsedContentDocument,
} from "./content-types";
import {
  validateOwnChronology,
  validateReachability,
  validateReferences,
  validateUniqueIds,
} from "./validate-content-graph";

export type ContentSetValidation =
  | Readonly<{ kind: "success"; documents: readonly ParsedContentDocument[] }>
  | Readonly<{ kind: "failure"; diagnostics: readonly ContentDiagnostic[] }>;

export function validateContentSet(files: readonly ContentSourceFile[]): ContentSetValidation {
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

  return { kind: "success", documents: uniqueDocuments };
}

export function compileContentSources(files: readonly ContentSourceFile[]): CompileContentResult {
  const validation = validateContentSet(files);
  if (validation.kind === "failure") {
    return { kind: "failure", diagnostics: validation.diagnostics };
  }

  try {
    return { kind: "success", bundle: buildContentBundle(validation.documents) };
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
