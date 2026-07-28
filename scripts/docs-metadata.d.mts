export const DOCUMENT_STATUSES: readonly [
  "accepted",
  "draft",
  "superseded",
  "proposed",
  "completed",
];

export type DocumentationMetadata = Readonly<{
  status?: unknown;
  superseded_by?: unknown;
}>;

export type DocumentationManifestEntry = Readonly<{
  file: string;
  status: string;
  supersededBy?: string;
}>;

export function validateDocumentationMetadata(
  file: string,
  metadata: DocumentationMetadata | null,
): readonly string[];

export function validateSupersessionTargets(
  entries: readonly DocumentationManifestEntry[],
): readonly string[];
