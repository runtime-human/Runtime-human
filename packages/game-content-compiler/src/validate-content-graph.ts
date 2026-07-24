import {
  createContentSetDiagnostic,
  diagnosticAtNode,
  type ContentDiagnostic,
} from "./content-diagnostics";
import { compareText, type ParsedContentDocument } from "./content-types";

export function validateUniqueIds(
  documents: readonly ParsedContentDocument[],
  diagnostics: ContentDiagnostic[],
): ParsedContentDocument[] {
  const unique = new Map<string, ParsedContentDocument>();
  for (const document of documents) {
    const previous = unique.get(document.source.id);
    if (previous !== undefined) {
      diagnostics.push(
        diagnosticAtNode(
          document,
          ["id"],
          "DUPLICATE_ID",
          `Duplicate content ID ${document.source.id}; first declared in ${previous.file.path}`,
        ),
      );
      continue;
    }
    unique.set(document.source.id, document);
  }
  return [...unique.values()].toSorted((left, right) =>
    compareText(left.source.id, right.source.id),
  );
}

export function validateOwnChronology(
  documents: readonly ParsedContentDocument[],
  diagnostics: ContentDiagnostic[],
): void {
  for (const document of documents) {
    if (
      document.source.availableTo !== undefined &&
      document.source.availableTo < document.source.availableFrom
    ) {
      diagnostics.push(
        diagnosticAtNode(
          document,
          ["availableTo"],
          "CHRONOLOGY_INVALID",
          `${document.source.id} ends before it becomes available`,
        ),
      );
    }
  }
}

export function validateReferences(
  documents: readonly ParsedContentDocument[],
  diagnostics: ContentDiagnostic[],
): void {
  const byId = new Map(documents.map((document) => [document.source.id, document]));
  for (const document of documents) {
    document.source.references.forEach((reference, index) => {
      const target = byId.get(reference);
      if (target === undefined) {
        diagnostics.push(
          diagnosticAtNode(
            document,
            ["references", index],
            "MISSING_REFERENCE",
            `${document.source.id} references missing content ${reference}`,
          ),
        );
        return;
      }

      const sourceEndsAfterTarget =
        target.source.availableTo !== undefined &&
        (document.source.availableTo === undefined ||
          document.source.availableTo > target.source.availableTo);
      if (
        document.source.availableFrom < target.source.availableFrom ||
        sourceEndsAfterTarget
      ) {
        diagnostics.push(
          diagnosticAtNode(
            document,
            ["references", index],
            "CHRONOLOGY_INVALID",
            `${document.source.id} references ${reference} outside its availability window`,
          ),
        );
      }
    });
  }
}

export function validateReachability(
  documents: readonly ParsedContentDocument[],
  diagnostics: ContentDiagnostic[],
): void {
  const pending = documents
    .filter((document) => document.source.entryPoint)
    .map((document) => document.source.id)
    .toSorted(compareText);

  if (pending.length === 0) {
    diagnostics.push(
      createContentSetDiagnostic(
        "NO_ENTRY_POINT",
        "Content set must declare at least one entry point",
      ),
    );
    return;
  }

  const byId = new Map(documents.map((document) => [document.source.id, document]));
  const reachable = new Set<string>();

  while (pending.length > 0) {
    const id = pending.shift();
    if (id === undefined || reachable.has(id)) continue;
    reachable.add(id);
    const document = byId.get(id);
    if (document === undefined) continue;
    for (const reference of document.source.references.toSorted(compareText)) {
      if (!reachable.has(reference) && byId.has(reference)) pending.push(reference);
    }
    pending.sort(compareText);
  }

  for (const document of documents) {
    if (!reachable.has(document.source.id)) {
      diagnostics.push(
        diagnosticAtNode(
          document,
          ["id"],
          "UNREACHABLE_CONTENT",
          `${document.source.id} is unreachable from every entry point`,
        ),
      );
    }
  }
}
