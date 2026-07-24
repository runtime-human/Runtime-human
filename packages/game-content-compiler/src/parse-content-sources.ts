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

const MAX_SOURCE_DEPTH = 64;
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

    const structuralDiagnostics = validateJsoncStructure(file, root);
    if (structuralDiagnostics.length > 0) {
      diagnostics.push(...structuralDiagnostics);
      continue;
    }

    const value: unknown = getNodeValue(root);
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

    if (!validateContentSource(value)) {
      diagnostics.push(...schemaDiagnostics(file, root, value, validateContentSource.errors ?? []));
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

function validateJsoncStructure(
  file: ContentSourceFile,
  root: JsoncNode,
): ContentDiagnostic[] {
  const diagnostics: ContentDiagnostic[] = [];
  const pending: PendingJsoncNode[] = [{ node: root, depth: 0 }];
  let nodes = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;

    nodes += 1;
    if (nodes > MAX_SOURCE_NODES) {
      return [
        createDiagnostic(
          file,
          "SCHEMA_INVALID",
          `Content source exceeds ${MAX_SOURCE_NODES} value nodes`,
          current.node.offset,
        ),
      ];
    }
    if (current.depth > MAX_SOURCE_DEPTH) {
      return [
        createDiagnostic(
          file,
          "SCHEMA_INVALID",
          `Content source exceeds depth ${MAX_SOURCE_DEPTH}`,
          current.node.offset,
        ),
      ];
    }

    if (current.node.type === "object") {
      const seen = new Set<string>();
      const values: JsoncNode[] = [];
      for (const property of current.node.children ?? []) {
        const keyNode = property.children?.[0];
        const valueNode = property.children?.[1];
        if (keyNode !== undefined && typeof keyNode.value === "string") {
          const key = keyNode.value;
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
        if (valueNode !== undefined) values.push(valueNode);
      }
      for (let index = values.length - 1; index >= 0; index -= 1) {
        const value = values[index];
        if (value !== undefined) pending.push({ node: value, depth: current.depth + 1 });
      }
      continue;
    }

    if (current.node.type === "array") {
      const children = current.node.children ?? [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child !== undefined) pending.push({ node: child, depth: current.depth + 1 });
      }
    }
  }

  return diagnostics;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown authoritative value error";
}
