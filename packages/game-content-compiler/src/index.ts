import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import {
  findNodeAtLocation,
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node as JsoncNode,
  type ParseError,
} from "jsonc-parser";

import type {
  CompiledContentArtifactV1,
  CompiledContentBundleV1,
  CompiledContentChunkDescriptorV1,
  CompiledContentChunkV1,
  CompiledContentEntryV1,
  CompiledContentManifestV1,
  CompiledContentProvenanceV1,
  ContentKindV1,
} from "@runtime-human/game-content";
import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";
import type { AuthoritativeJsonValue } from "@runtime-human/game-schema";

const COMPILER_VERSION = "content-compiler-v1" as const;
const IDENTIFIER_PATTERN = "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$";
const MONTH_PATTERN = "^[0-9]{4}-(0[1-9]|1[0-2])$";

export type ContentSourceFile = Readonly<{
  path: string;
  text: string;
}>;

export type ContentDiagnosticCode =
  | "JSONC_PARSE"
  | "SCHEMA_INVALID"
  | "INVALID_PATH"
  | "DUPLICATE_PATH"
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

type ContentSourceDocumentV1 = Readonly<{
  schemaVersion: "content-source-v1";
  id: string;
  kind: ContentKindV1;
  domain: string;
  era: string;
  availableFrom: string;
  availableTo?: string;
  entryPoint: boolean;
  references: readonly string[];
  provenance: readonly CompiledContentProvenanceV1[];
  payload: AuthoritativeJsonValue;
}>;

type ParsedDocument = Readonly<{
  file: ContentSourceFile;
  root: JsoncNode;
  source: ContentSourceDocumentV1;
}>;

const CONTENT_SOURCE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/content-source-v1",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "id",
    "kind",
    "domain",
    "era",
    "availableFrom",
    "entryPoint",
    "references",
    "provenance",
    "payload",
  ],
  properties: {
    schemaVersion: { const: "content-source-v1" },
    id: { $ref: "#/$defs/identifier" },
    kind: { enum: ["event", "reference", "storylet", "technology"] },
    domain: { $ref: "#/$defs/identifier" },
    era: { $ref: "#/$defs/identifier" },
    availableFrom: { $ref: "#/$defs/month" },
    availableTo: { $ref: "#/$defs/month" },
    entryPoint: { type: "boolean" },
    references: {
      type: "array",
      uniqueItems: true,
      items: { $ref: "#/$defs/identifier" },
    },
    provenance: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/provenance" },
    },
    payload: { $ref: "#/$defs/authoritativeValue" },
  },
  $defs: {
    identifier: {
      type: "string",
      pattern: IDENTIFIER_PATTERN,
      minLength: 1,
      maxLength: 160,
    },
    month: {
      type: "string",
      pattern: MONTH_PATTERN,
    },
    provenance: {
      type: "object",
      additionalProperties: false,
      required: ["sourceId", "title"],
      properties: {
        sourceId: { $ref: "#/$defs/identifier" },
        title: { type: "string", minLength: 1, maxLength: 500 },
        locator: { type: "string", minLength: 1, maxLength: 1000 },
      },
    },
    authoritativeValue: {
      oneOf: [
        { type: "null" },
        { type: "boolean" },
        { type: "string" },
        {
          type: "integer",
          minimum: Number.MIN_SAFE_INTEGER,
          maximum: Number.MAX_SAFE_INTEGER,
        },
        {
          type: "array",
          items: { $ref: "#/$defs/authoritativeValue" },
        },
        {
          type: "object",
          additionalProperties: { $ref: "#/$defs/authoritativeValue" },
        },
      ],
    },
  },
} as const;

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
});
const validateContentSource: ValidateFunction<ContentSourceDocumentV1> =
  ajv.compile<ContentSourceDocumentV1>(CONTENT_SOURCE_SCHEMA);

export function compileContentSources(files: readonly ContentSourceFile[]): CompileContentResult {
  const diagnostics: ContentDiagnostic[] = [];
  const parsed = parseFiles(files, diagnostics);
  const uniqueDocuments = validateUniqueIds(parsed, diagnostics);

  validateOwnChronology(uniqueDocuments, diagnostics);
  validateReferences(uniqueDocuments, diagnostics);
  validateReachability(uniqueDocuments, diagnostics);

  if (diagnostics.length > 0) {
    return { kind: "failure", diagnostics: diagnostics.toSorted(compareDiagnostics) };
  }

  return { kind: "success", bundle: buildBundle(uniqueDocuments) };
}

function parseFiles(
  files: readonly ContentSourceFile[],
  diagnostics: ContentDiagnostic[],
): ParsedDocument[] {
  const parsed: ParsedDocument[] = [];
  const seenPaths = new Set<string>();

  for (const file of files.toSorted((left, right) => compareText(left.path, right.path))) {
    const normalizedPath = normalizeSourcePath(file.path);
    if (normalizedPath === null) {
      diagnostics.push(
        createDiagnostic(
          file,
          "INVALID_PATH",
          "Content source path must be relative and normalized",
          0,
        ),
      );
      continue;
    }
    if (seenPaths.has(normalizedPath)) {
      diagnostics.push(
        createDiagnostic(
          file,
          "DUPLICATE_PATH",
          `Duplicate content source path ${normalizedPath}`,
          0,
        ),
      );
      continue;
    }
    seenPaths.add(normalizedPath);

    const parseErrors: ParseError[] = [];
    const root = parseTree(file.text, parseErrors, {
      allowTrailingComma: false,
      disallowComments: false,
    });
    if (root === undefined || parseErrors.length > 0) {
      for (const error of parseErrors) {
        diagnostics.push(
          createDiagnostic(
            file,
            "JSONC_PARSE",
            `JSONC parse error: ${printParseErrorCode(error.error)}`,
            error.offset,
          ),
        );
      }
      if (parseErrors.length === 0) {
        diagnostics.push(createDiagnostic(file, "JSONC_PARSE", "JSONC document is empty", 0));
      }
      continue;
    }

    const value: unknown = getNodeValue(root);
    if (!validateContentSource(value)) {
      diagnostics.push(...schemaDiagnostics(file, root, value, validateContentSource.errors ?? []));
      continue;
    }

    parsed.push({ file: { path: normalizedPath, text: file.text }, root, source: value });
  }

  return parsed;
}

function schemaDiagnostics(
  file: ContentSourceFile,
  root: JsoncNode,
  value: unknown,
  errors: readonly ErrorObject[],
): ContentDiagnostic[] {
  const contentId = readContentId(value);
  return errors.map((error) => {
    const path = jsonPointerPath(error.instancePath);
    const node = findNodeAtLocation(root, path) ?? root;
    const location = offsetLocation(file.text, node.offset);
    const suffix = error.message === undefined ? "" : ` ${error.message}`;
    return withOptionalContentId(
      {
        code: "SCHEMA_INVALID",
        message: `Schema ${error.instancePath || "/"}${suffix}`,
        path: file.path,
        line: location.line,
        column: location.column,
      },
      contentId,
    );
  });
}

function validateUniqueIds(
  documents: readonly ParsedDocument[],
  diagnostics: ContentDiagnostic[],
): ParsedDocument[] {
  const unique = new Map<string, ParsedDocument>();
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

function validateOwnChronology(
  documents: readonly ParsedDocument[],
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

function validateReferences(
  documents: readonly ParsedDocument[],
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
      if (
        document.source.availableFrom < target.source.availableFrom ||
        (target.source.availableTo !== undefined &&
          document.source.availableFrom > target.source.availableTo)
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

function validateReachability(
  documents: readonly ParsedDocument[],
  diagnostics: ContentDiagnostic[],
): void {
  const byId = new Map(documents.map((document) => [document.source.id, document]));
  const reachable = new Set<string>();
  const pending = documents
    .filter((document) => document.source.entryPoint)
    .map((document) => document.source.id)
    .toSorted(compareText);

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

function buildBundle(documents: readonly ParsedDocument[]): CompiledContentBundleV1 {
  const entries = documents.map(({ source }) => normalizeEntry(source));
  const chunks = buildChunks(entries);
  const descriptors: CompiledContentChunkDescriptorV1[] = chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    era: chunk.era,
    domain: chunk.domain,
    contentIds: chunk.entries.map((entry) => entry.id),
    chunkFingerprint: chunk.chunkFingerprint,
  }));
  const entryPointIds = entries
    .filter((entry) => entry.entryPoint)
    .map((entry) => entry.id)
    .toSorted(compareText);
  const contentFingerprint = fingerprint("compiled-content-manifest-v1", {
    compilerVersion: COMPILER_VERSION,
    entryPointIds,
    chunks: descriptors,
  });
  const manifest: CompiledContentManifestV1 = {
    schemaVersion: "compiled-content-manifest-v1",
    compilerVersion: COMPILER_VERSION,
    contentFingerprint,
    entryPointIds,
    chunks: descriptors,
  };
  const artifacts: CompiledContentArtifactV1[] = [
    ...chunks.map((chunk) => ({
      path: `chunks/${chunk.chunkId}.json`,
      json: `${canonicalizeAuthoritative(chunk)}\n`,
    })),
    {
      path: "manifest.json",
      json: `${canonicalizeAuthoritative(manifest)}\n`,
    },
  ].toSorted((left, right) => compareText(left.path, right.path));

  return { manifest, chunks, artifacts };
}

function normalizeEntry(source: ContentSourceDocumentV1): CompiledContentEntryV1 {
  const base = {
    schemaVersion: "compiled-content-entry-v1" as const,
    id: source.id,
    kind: source.kind,
    domain: source.domain,
    era: source.era,
    availableFrom: source.availableFrom,
    entryPoint: source.entryPoint,
    references: source.references.toSorted(compareText),
    provenance: source.provenance.map((item) => ({ ...item })).toSorted(compareProvenance),
    payload: source.payload,
  };
  return source.availableTo === undefined ? base : { ...base, availableTo: source.availableTo };
}

function buildChunks(entries: readonly CompiledContentEntryV1[]): CompiledContentChunkV1[] {
  const groups = new Map<string, CompiledContentEntryV1[]>();
  for (const entry of entries) {
    const chunkId = `${entry.era}/${entry.domain}`;
    const group = groups.get(chunkId) ?? [];
    group.push(entry);
    groups.set(chunkId, group);
  }

  return [...groups.entries()]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([chunkId, group]) => {
      const sortedEntries = group.toSorted((left, right) => compareText(left.id, right.id));
      const [era, domain] = chunkId.split("/");
      if (era === undefined || domain === undefined) {
        throw new Error(`Invalid compiler-owned chunk ID ${chunkId}`);
      }
      const core = {
        schemaVersion: "compiled-content-chunk-v1" as const,
        chunkId,
        era,
        domain,
        entries: sortedEntries,
      };
      return {
        ...core,
        chunkFingerprint: fingerprint("compiled-content-chunk-v1", core),
      };
    });
}

function normalizeSourcePath(path: string): string | null {
  const normalized = path.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized
      .split("/")
      .some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    return null;
  }
  return normalized;
}

function diagnosticAtNode(
  document: ParsedDocument,
  path: readonly (string | number)[],
  code: ContentDiagnosticCode,
  message: string,
): ContentDiagnostic {
  const node = findNodeAtLocation(document.root, [...path]) ?? document.root;
  const location = offsetLocation(document.file.text, node.offset);
  return {
    code,
    message,
    path: document.file.path,
    line: location.line,
    column: location.column,
    contentId: document.source.id,
  };
}

function createDiagnostic(
  file: ContentSourceFile,
  code: ContentDiagnosticCode,
  message: string,
  offset: number,
): ContentDiagnostic {
  const location = offsetLocation(file.text, offset);
  return {
    code,
    message,
    path: file.path,
    line: location.line,
    column: location.column,
  };
}

function withOptionalContentId(
  diagnostic: Omit<ContentDiagnostic, "contentId">,
  contentId: string | undefined,
): ContentDiagnostic {
  return contentId === undefined ? diagnostic : { ...diagnostic, contentId };
}

function readContentId(value: unknown): string | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const id = (value as Readonly<Record<string, unknown>>).id;
  return typeof id === "string" ? id : undefined;
}

function jsonPointerPath(pointer: string): (string | number)[] {
  if (pointer.length === 0) return [];
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((segment) => (/^(0|[1-9][0-9]*)$/u.test(segment) ? Number(segment) : segment));
}

function offsetLocation(text: string, offset: number): Readonly<{ line: number; column: number }> {
  const prefix = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const lines = prefix.split(/\r\n|\n|\r/u);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function compareDiagnostics(left: ContentDiagnostic, right: ContentDiagnostic): number {
  return (
    compareText(left.path, right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

function compareProvenance(
  left: CompiledContentProvenanceV1,
  right: CompiledContentProvenanceV1,
): number {
  return (
    compareText(left.sourceId, right.sourceId) ||
    compareText(left.title, right.title) ||
    compareText(left.locator ?? "", right.locator ?? "")
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
