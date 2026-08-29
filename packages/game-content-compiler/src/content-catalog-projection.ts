import type { ContentKindV1 } from "@runtime-human/game-content";

import type { ContentDiagnostic } from "./content-diagnostics";
import { validateContentSet } from "./compile-content-sources";
import { compareText, type ContentSourceFile, type ParsedContentDocument } from "./content-types";

export type ContentCatalogProvenanceV1 = Readonly<{
  sourceId: string;
  title: string;
  locator?: string;
}>;

export type ContentCatalogEntryV1 = Readonly<{
  id: string;
  kind: ContentKindV1;
  domain: string;
  era: string;
  availableFrom: string;
  availableTo?: string;
  entryPoint: boolean;
  references: readonly string[];
  provenance: readonly ContentCatalogProvenanceV1[];
  sourcePath: string;
}>;

export type ContentCatalogProjectionResult =
  | Readonly<{ kind: "success"; entries: readonly ContentCatalogEntryV1[] }>
  | Readonly<{ kind: "failure"; diagnostics: readonly ContentDiagnostic[] }>;

export function projectContentCatalog(
  files: readonly ContentSourceFile[],
): ContentCatalogProjectionResult {
  const validation = validateContentSet(files);
  if (validation.kind === "failure") {
    return { kind: "failure", diagnostics: validation.diagnostics };
  }

  return {
    kind: "success",
    entries: validation.documents
      .map(toCatalogEntry)
      .toSorted((left, right) => compareText(left.id, right.id)),
  };
}

function toCatalogEntry(document: ParsedContentDocument): ContentCatalogEntryV1 {
  const { source, file } = document;
  return {
    id: source.id,
    kind: source.kind,
    domain: source.domain,
    era: source.era,
    availableFrom: source.availableFrom,
    ...(source.availableTo === undefined ? {} : { availableTo: source.availableTo }),
    entryPoint: source.entryPoint,
    references: source.references.toSorted(compareText),
    provenance: source.provenance,
    sourcePath: file.path,
  };
}
