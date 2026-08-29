import type { ErrorObject } from "ajv/dist/2020.js";
import { findNodeAtLocation, type Node as JsoncNode } from "jsonc-parser";

import type { ContentSourceFile, ParsedContentDocument } from "./content-types";
import { compareText } from "./content-types";

export type ContentDiagnosticCode =
  | "JSONC_PARSE"
  | "SCHEMA_INVALID"
  | "INVALID_PATH"
  | "DUPLICATE_PATH"
  | "DUPLICATE_ID"
  | "NO_ENTRY_POINT"
  | "MISSING_REFERENCE"
  | "CHRONOLOGY_INVALID"
  | "UNREACHABLE_CONTENT"
  | "CONTENT_LIMIT_EXCEEDED";

export type ContentDiagnostic = Readonly<{
  code: ContentDiagnosticCode;
  message: string;
  path: string;
  line: number;
  column: number;
  pointer?: string;
  contentId?: string;
}>;

export function diagnosticAtNode(
  document: ParsedContentDocument,
  path: readonly (string | number)[],
  code: ContentDiagnosticCode,
  message: string,
): ContentDiagnostic {
  const node = findNodeAtLocation(document.root, [...path]) ?? document.root;
  const location = offsetLocation(document.file.text, node.offset);
  const pointer = toJsonPointer(path);
  return {
    code,
    message,
    path: document.file.path,
    line: location.line,
    column: location.column,
    ...(pointer === undefined ? {} : { pointer }),
    contentId: document.source.id,
  };
}

export function createDiagnostic(
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

export function createContentSetDiagnostic(
  code: ContentDiagnosticCode,
  message: string,
): ContentDiagnostic {
  return {
    code,
    message,
    path: "<content-set>",
    line: 1,
    column: 1,
  };
}

export function schemaDiagnostics(
  file: ContentSourceFile,
  root: JsoncNode,
  value: unknown,
  errors: readonly ErrorObject[],
): ContentDiagnostic[] {
  const contentId = readContentId(value);
  return errors.map((error) => {
    const path = jsonPointerPath(error.instancePath);
    const node = findNodeAtLocation(root, [...path]) ?? root;
    const location = offsetLocation(file.text, node.offset);
    const suffix = error.message === undefined ? "" : ` ${error.message}`;
    return withOptionalFields(
      {
        code: "SCHEMA_INVALID",
        message: `Schema ${error.instancePath || "/"}${suffix}`,
        path: file.path,
        line: location.line,
        column: location.column,
      },
      contentId,
      error.instancePath.length > 0 ? error.instancePath : undefined,
    );
  });
}

export function compareDiagnostics(left: ContentDiagnostic, right: ContentDiagnostic): number {
  return (
    compareText(left.path, right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

function withOptionalFields(
  diagnostic: Omit<ContentDiagnostic, "contentId" | "pointer">,
  contentId: string | undefined,
  pointer: string | undefined,
): ContentDiagnostic {
  return {
    ...diagnostic,
    ...(contentId === undefined ? {} : { contentId }),
    ...(pointer === undefined ? {} : { pointer }),
  };
}

function toJsonPointer(path: readonly (string | number)[]): string | undefined {
  if (path.length === 0) return undefined;
  return `/${path
    .map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
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
    .map((segment) => (/^(0|[1-9]\d*)$/u.test(segment) ? Number(segment) : segment));
}

function offsetLocation(text: string, offset: number): Readonly<{ line: number; column: number }> {
  const prefix = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const lines = prefix.split(/\r\n|\n|\r/u);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}
