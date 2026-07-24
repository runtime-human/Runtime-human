import {
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node as JsoncNode,
  type ParseError,
} from "jsonc-parser";

import { canonicalizeAuthoritative } from "@runtime-human/game-core";

import {
  createDiagnostic,
  schemaDiagnostics,
  type ContentDiagnostic,
} from "./content-diagnostics";
import { validateContentSource } from "./content-source-schema";
import {
  compareText,
  type ContentSourceFile,
  type ParsedContentDocument,
} from "./content-types";

export function parseContentSources(
  files: readonly ContentSourceFile[],
  diagnostics: ContentDiagnostic[],
): ParsedContentDocument[] {
  const parsed: ParsedContentDocument[] = [];
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

    const duplicateProperties = duplicatePropertyDiagnostics(file, root);
    if (duplicateProperties.length > 0) {
      diagnostics.push(...duplicateProperties);
      continue;
    }

    const value: unknown = getNodeValue(root);
    if (!validateContentSource(value)) {
      diagnostics.push(...schemaDiagnostics(file, root, value, validateContentSource.errors ?? []));
      continue;
    }

    try {
      canonicalizeAuthoritative(value);
    } catch (error) {
      diagnostics.push(
        createDiagnostic(
          file,
          "SCHEMA_INVALID",
          `Authoritative content is invalid: ${readErrorMessage(error)}`,
          root.offset,
        ),
      );
      continue;
    }

    parsed.push({ file: { path: normalizedPath, text: file.text }, root, source: value });
  }

  return parsed;
}

export function normalizeSourcePath(path: string): string | null {
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

function duplicatePropertyDiagnostics(
  file: ContentSourceFile,
  root: JsoncNode,
): ContentDiagnostic[] {
  const diagnostics: ContentDiagnostic[] = [];
  collectDuplicateProperties(file, root, diagnostics);
  return diagnostics;
}

function collectDuplicateProperties(
  file: ContentSourceFile,
  node: JsoncNode,
  diagnostics: ContentDiagnostic[],
): void {
  if (node.type === "object") {
    const seen = new Set<string>();
    for (const property of node.children ?? []) {
      const keyNode = property.children?.[0];
      const valueNode = property.children?.[1];
      const key = typeof keyNode?.value === "string" ? keyNode.value : undefined;
      if (key !== undefined) {
        if (seen.has(key)) {
          diagnostics.push(
            createDiagnostic(
              file,
              "JSONC_PARSE",
              `Duplicate JSONC property ${JSON.stringify(key)}`,
              keyNode.offset,
            ),
          );
        } else {
          seen.add(key);
        }
      }
      if (valueNode !== undefined) collectDuplicateProperties(file, valueNode, diagnostics);
    }
    return;
  }

  for (const child of node.children ?? []) {
    collectDuplicateProperties(file, child, diagnostics);
  }
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown authoritative value error";
}
