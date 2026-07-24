import {
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node as JsoncNode,
  type ParseError,
} from "jsonc-parser";

import { canonicalizeAuthoritative } from "@runtime-human/game-core";

import { createDiagnostic, schemaDiagnostics, type ContentDiagnostic } from "./content-diagnostics";
import { validateContentSource } from "./content-source-schema";
import { compareText, type ContentSourceFile, type ParsedContentDocument } from "./content-types";

const MAX_SOURCE_DEPTH = 61;
const MAX_SOURCE_NODES = 100_000;

type PendingJsoncNode = Readonly<{
  node: JsoncNode;
  depth: number;
}>;

export function parseContentSources(
  files: readonly ContentSourceFile[],
  diagnostics: ContentDiagnostic[],
): ParsedContentDocument[] {
  const parsed: ParsedContentDocument[] = [];
  const seenPaths = new Set<string>();

  for (const file of files.toSorted((left, right) => compareText(left.path, right.path))) {
    const normalizedPath = registerSourcePath(file, seenPaths, diagnostics);
    if (normalizedPath === null) continue;

    const document = parseContentSource(file, normalizedPath, diagnostics);
    if (document !== null) parsed.push(document);
  }

  return parsed;
}

export function normalizeSourcePath(path: string): string | null {
  const normalized = path.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/u.test(normalized) ||
    normalized
      .split("/")
      .some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    return null;
  }
  return normalized;
}

function registerSourcePath(
  file: ContentSourceFile,
  seenPaths: Set<string>,
  diagnostics: ContentDiagnostic[],
): string | null {
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
    return null;
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
    return null;
  }

  seenPaths.add(normalizedPath);
  return normalizedPath;
}

function parseContentSource(
  file: ContentSourceFile,
  normalizedPath: string,
  diagnostics: ContentDiagnostic[],
): ParsedContentDocument | null {
  const root = parseJsoncRoot(file, diagnostics);
  if (root === null) return null;

  const structuralDiagnostics = validateJsoncStructure(file, root);
  if (structuralDiagnostics.length > 0) {
    diagnostics.push(...structuralDiagnostics);
    return null;
  }

  const value: unknown = getNodeValue(root);
  if (!validateAuthoritativeValue(file, root, value, diagnostics)) return null;

  if (!validateContentSource(value)) {
    diagnostics.push(...schemaDiagnostics(file, root, value, validateContentSource.errors ?? []));
    return null;
  }

  return { file: { path: normalizedPath, text: file.text }, root, source: value };
}

function parseJsoncRoot(
  file: ContentSourceFile,
  diagnostics: ContentDiagnostic[],
): JsoncNode | null {
  const parseErrors: ParseError[] = [];
  const root = parseTree(file.text, parseErrors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (root !== undefined && parseErrors.length === 0) return root;
  reportJsoncParseErrors(file, parseErrors, diagnostics);
  return null;
}

function reportJsoncParseErrors(
  file: ContentSourceFile,
  parseErrors: readonly ParseError[],
  diagnostics: ContentDiagnostic[],
): void {
  if (parseErrors.length === 0) {
    diagnostics.push(createDiagnostic(file, "JSONC_PARSE", "JSONC document is empty", 0));
    return;
  }

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
}

function validateAuthoritativeValue(
  file: ContentSourceFile,
  root: JsoncNode,
  value: unknown,
  diagnostics: ContentDiagnostic[],
): boolean {
  try {
    canonicalizeAuthoritative(value);
    return true;
  } catch (error) {
    diagnostics.push(
      createDiagnostic(
        file,
        "SCHEMA_INVALID",
        `Authoritative content is invalid: ${readErrorMessage(error)}`,
        root.offset,
      ),
    );
    return false;
  }
}

function validateJsoncStructure(file: ContentSourceFile, root: JsoncNode): ContentDiagnostic[] {
  const diagnostics: ContentDiagnostic[] = [];
  const pending: PendingJsoncNode[] = [{ node: root, depth: 0 }];
  let nodes = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;

    nodes += 1;
    const limitDiagnostic = sourceLimitDiagnostic(file, current, nodes);
    if (limitDiagnostic !== null) return [limitDiagnostic];

    enqueueChildNodes(file, current, pending, diagnostics);
  }

  return diagnostics;
}

function sourceLimitDiagnostic(
  file: ContentSourceFile,
  current: PendingJsoncNode,
  nodes: number,
): ContentDiagnostic | null {
  if (nodes > MAX_SOURCE_NODES) {
    return createDiagnostic(
      file,
      "SCHEMA_INVALID",
      `Content source exceeds ${MAX_SOURCE_NODES} value nodes`,
      current.node.offset,
    );
  }

  if (current.depth > MAX_SOURCE_DEPTH) {
    return createDiagnostic(
      file,
      "SCHEMA_INVALID",
      `Content source exceeds depth ${MAX_SOURCE_DEPTH}`,
      current.node.offset,
    );
  }

  return null;
}

function enqueueChildNodes(
  file: ContentSourceFile,
  current: PendingJsoncNode,
  pending: PendingJsoncNode[],
  diagnostics: ContentDiagnostic[],
): void {
  if (current.node.type === "object") {
    enqueueObjectValues(file, current, pending, diagnostics);
    return;
  }

  if (current.node.type === "array") {
    enqueueValues(current.node.children ?? [], current.depth + 1, pending);
  }
}

function enqueueObjectValues(
  file: ContentSourceFile,
  current: PendingJsoncNode,
  pending: PendingJsoncNode[],
  diagnostics: ContentDiagnostic[],
): void {
  const seen = new Set<string>();
  const values: JsoncNode[] = [];

  for (const property of current.node.children ?? []) {
    recordObjectKey(file, property.children?.[0], seen, diagnostics);
    const valueNode = property.children?.[1];
    if (valueNode !== undefined) values.push(valueNode);
  }

  enqueueValues(values, current.depth + 1, pending);
}

function recordObjectKey(
  file: ContentSourceFile,
  keyNode: JsoncNode | undefined,
  seen: Set<string>,
  diagnostics: ContentDiagnostic[],
): void {
  if (keyNode === undefined || typeof keyNode.value !== "string") return;

  const key = keyNode.value;
  if (!seen.has(key)) {
    seen.add(key);
    return;
  }

  diagnostics.push(
    createDiagnostic(
      file,
      "JSONC_PARSE",
      `Duplicate JSONC property ${JSON.stringify(key)}`,
      keyNode.offset,
    ),
  );
}

function enqueueValues(
  values: readonly JsoncNode[],
  depth: number,
  pending: PendingJsoncNode[],
): void {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== undefined) pending.push({ node: value, depth });
  }
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown authoritative value error";
}
