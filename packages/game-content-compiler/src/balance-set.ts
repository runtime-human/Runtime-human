import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import {
  findNodeAtLocation,
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node as JsoncNode,
  type ParseError,
} from "jsonc-parser";

import { compareText, type ContentSourceFile } from "./content-types";
import { normalizeSourcePath } from "./parse-content-sources";

export const QUALITY_BALANCE_SCHEMA_VERSION = "quality-balance-v1" as const;
export const SKILL_EVIDENCE_BALANCE_SCHEMA_VERSION = "skill-evidence-balance-v1" as const;

const IDENTIFIER_PATTERN = "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$";

export type QualityModifiersV1 = Readonly<{
  clarity: number;
  correctness: number;
  reliability: number;
}>;

export type QualityBalanceDocumentV1 = Readonly<{
  schemaVersion: typeof QUALITY_BALANCE_SCHEMA_VERSION;
  sliceId: string;
  base: Readonly<{ clarity: number; correctness: number; reliability: number }>;
  access: Readonly<Record<"home-pc" | "shared-school-pc", QualityModifiersV1>>;
  learning: Readonly<Record<"read-and-run" | "edit-and-debug", QualityModifiersV1>>;
  defectResponse: Readonly<
    Record<"inspect-listing" | "change-input" | "ask-for-guidance", QualityModifiersV1>
  >;
  outcomeRoll: Readonly<{ minimum: number; maximum: number }>;
}>;

export type SkillEvidenceBalanceDocumentV1 = Readonly<{
  schemaVersion: typeof SKILL_EVIDENCE_BALANCE_SCHEMA_VERSION;
  sliceId: string;
  programWriting: Readonly<Record<"read-and-run" | "edit-and-debug", number>>;
  debugging: Readonly<Record<"inspect-listing" | "change-input" | "ask-for-guidance", number>>;
  toolUse: Readonly<Record<"home-pc" | "shared-school-pc", number>>;
}>;

export const QUALITY_BALANCE_SCHEMA_V1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/quality-balance-v1",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "sliceId",
    "base",
    "access",
    "learning",
    "defectResponse",
    "outcomeRoll",
  ],
  properties: {
    schemaVersion: { const: "quality-balance-v1" },
    sliceId: { $ref: "#/$defs/identifier" },
    base: { $ref: "#/$defs/baseScores" },
    access: { $ref: "#/$defs/accessTable" },
    learning: { $ref: "#/$defs/learningTable" },
    defectResponse: { $ref: "#/$defs/defectResponseTable" },
    outcomeRoll: { $ref: "#/$defs/outcomeRoll" },
  },
  $defs: {
    identifier: {
      type: "string",
      pattern: IDENTIFIER_PATTERN,
      minLength: 1,
      maxLength: 160,
    },
    baseScores: {
      type: "object",
      additionalProperties: false,
      required: ["clarity", "correctness", "reliability"],
      properties: {
        clarity: { type: "integer", minimum: 0, maximum: 100 },
        correctness: { type: "integer", minimum: 0, maximum: 100 },
        reliability: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
    qualityModifiers: {
      type: "object",
      additionalProperties: false,
      required: ["clarity", "correctness", "reliability"],
      properties: {
        clarity: { type: "integer", minimum: 0, maximum: 10 },
        correctness: { type: "integer", minimum: 0, maximum: 10 },
        reliability: { type: "integer", minimum: 0, maximum: 10 },
      },
    },
    accessTable: {
      type: "object",
      additionalProperties: false,
      required: ["home-pc", "shared-school-pc"],
      properties: {
        "home-pc": { $ref: "#/$defs/qualityModifiers" },
        "shared-school-pc": { $ref: "#/$defs/qualityModifiers" },
      },
    },
    learningTable: {
      type: "object",
      additionalProperties: false,
      required: ["read-and-run", "edit-and-debug"],
      properties: {
        "read-and-run": { $ref: "#/$defs/qualityModifiers" },
        "edit-and-debug": { $ref: "#/$defs/qualityModifiers" },
      },
    },
    defectResponseTable: {
      type: "object",
      additionalProperties: false,
      required: ["inspect-listing", "change-input", "ask-for-guidance"],
      properties: {
        "inspect-listing": { $ref: "#/$defs/qualityModifiers" },
        "change-input": { $ref: "#/$defs/qualityModifiers" },
        "ask-for-guidance": { $ref: "#/$defs/qualityModifiers" },
      },
    },
    outcomeRoll: {
      type: "object",
      additionalProperties: false,
      required: ["minimum", "maximum"],
      properties: {
        minimum: { type: "integer", minimum: 0, maximum: 10 },
        maximum: { type: "integer", minimum: 0, maximum: 10 },
      },
    },
  },
} as const;

export const SKILL_EVIDENCE_BALANCE_SCHEMA_V1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/skill-evidence-balance-v1",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "sliceId", "programWriting", "debugging", "toolUse"],
  properties: {
    schemaVersion: { const: "skill-evidence-balance-v1" },
    sliceId: { $ref: "#/$defs/identifier" },
    programWriting: { $ref: "#/$defs/learningAmountTable" },
    debugging: { $ref: "#/$defs/defectResponseAmountTable" },
    toolUse: { $ref: "#/$defs/accessAmountTable" },
  },
  $defs: {
    identifier: {
      type: "string",
      pattern: IDENTIFIER_PATTERN,
      minLength: 1,
      maxLength: 160,
    },
    learningAmountTable: {
      type: "object",
      additionalProperties: false,
      required: ["read-and-run", "edit-and-debug"],
      properties: {
        "read-and-run": { $ref: "#/$defs/evidenceAmount" },
        "edit-and-debug": { $ref: "#/$defs/evidenceAmount" },
      },
    },
    defectResponseAmountTable: {
      type: "object",
      additionalProperties: false,
      required: ["inspect-listing", "change-input", "ask-for-guidance"],
      properties: {
        "inspect-listing": { $ref: "#/$defs/evidenceAmount" },
        "change-input": { $ref: "#/$defs/evidenceAmount" },
        "ask-for-guidance": { $ref: "#/$defs/evidenceAmount" },
      },
    },
    accessAmountTable: {
      type: "object",
      additionalProperties: false,
      required: ["home-pc", "shared-school-pc"],
      properties: {
        "home-pc": { $ref: "#/$defs/evidenceAmount" },
        "shared-school-pc": { $ref: "#/$defs/evidenceAmount" },
      },
    },
    evidenceAmount: {
      type: "integer",
      minimum: 1,
      maximum: 10,
    },
  },
} as const;

export type BalanceDiagnosticCode =
  | "JSONC_PARSE"
  | "SCHEMA_INVALID"
  | "INVALID_PATH"
  | "DUPLICATE_PATH"
  | "BAL001_INCOMPLETE_TABLE"
  | "BAL002_INVALID_RANGE"
  | "BAL003_SLICE_ID_MISMATCH"
  | "BAL004_DUPLICATE_FAMILY"
  | "BAL005_FORBIDDEN_PROPERTY";

export type BalanceDiagnostic = Readonly<{
  code: BalanceDiagnosticCode;
  message: string;
  path: string;
  line: number;
  column: number;
  pointer?: string;
  sliceId?: string;
}>;

export type BalanceFamily = "quality" | "skill-evidence";

export type ValidatedBalanceDocumentV1 =
  | Readonly<{
      path: string;
      family: "quality";
      sliceId: string;
      document: QualityBalanceDocumentV1;
    }>
  | Readonly<{
      path: string;
      family: "skill-evidence";
      sliceId: string;
      document: SkillEvidenceBalanceDocumentV1;
    }>;

export type BalanceSliceCompilationV1 = Readonly<{
  sliceId: string;
  quality: QualityBalanceDocumentV1;
  skillEvidence: SkillEvidenceBalanceDocumentV1;
}>;

export type BalanceSetCompilation =
  | Readonly<{ kind: "success"; slices: readonly BalanceSliceCompilationV1[] }>
  | Readonly<{ kind: "failure"; diagnostics: readonly BalanceDiagnostic[] }>;

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
});

const validateQualityBalance: ValidateFunction<QualityBalanceDocumentV1> =
  ajv.compile<QualityBalanceDocumentV1>(QUALITY_BALANCE_SCHEMA_V1);
const validateSkillEvidenceBalance: ValidateFunction<SkillEvidenceBalanceDocumentV1> =
  ajv.compile<SkillEvidenceBalanceDocumentV1>(SKILL_EVIDENCE_BALANCE_SCHEMA_V1);

export function compileBalanceSet(files: readonly ContentSourceFile[]): BalanceSetCompilation {
  const diagnostics: BalanceDiagnostic[] = [];
  const documents: ValidatedBalanceDocumentV1[] = [];
  const seenPaths = new Set<string>();

  for (const file of files.toSorted((left, right) => compareText(left.path, right.path))) {
    compileBalanceFile(file, seenPaths, documents, diagnostics);
  }

  const slices = requireCompleteSlices(documents, diagnostics);
  if (diagnostics.length > 0) {
    return { kind: "failure", diagnostics: diagnostics.toSorted(compareBalanceDiagnostics) };
  }
  return { kind: "success", slices };
}

export function formatBalanceDiagnostics(
  diagnostics: readonly BalanceDiagnostic[],
): readonly string[] {
  return diagnostics
    .toSorted(compareBalanceDiagnostics)
    .map(
      (diagnostic) =>
        `${diagnostic.path}:${diagnostic.line}:${diagnostic.column} ${diagnostic.code} ${diagnostic.message}`,
    );
}

export function compareBalanceDiagnostics(
  left: BalanceDiagnostic,
  right: BalanceDiagnostic,
): number {
  return (
    compareText(left.path, right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

function compileBalanceFile(
  file: ContentSourceFile,
  seenPaths: Set<string>,
  documents: ValidatedBalanceDocumentV1[],
  diagnostics: BalanceDiagnostic[],
): void {
  const normalizedPath = normalizeSourcePath(file.path);
  if (normalizedPath === null) {
    diagnostics.push(
      balanceDiagnostic(
        file,
        "INVALID_PATH",
        "Balance source path must be relative and normalized",
        0,
      ),
    );
    return;
  }
  if (seenPaths.has(normalizedPath)) {
    diagnostics.push(
      balanceDiagnostic(
        file,
        "DUPLICATE_PATH",
        `Duplicate balance source path ${normalizedPath}`,
        0,
      ),
    );
    return;
  }
  seenPaths.add(normalizedPath);

  const root = parseJsoncRoot(file, diagnostics);
  if (root === null) return;

  const forbiddenDiagnostics = validateForbiddenProperties(file, root);
  if (forbiddenDiagnostics.length > 0) {
    diagnostics.push(...forbiddenDiagnostics);
    return;
  }

  const value = toPlainJson(getNodeValue(root));
  const family = readBalanceFamily(value);
  if (family === null) {
    diagnostics.push(
      balanceDiagnostic(
        file,
        "SCHEMA_INVALID",
        `Balance document schemaVersion must be ${QUALITY_BALANCE_SCHEMA_VERSION} or ${SKILL_EVIDENCE_BALANCE_SCHEMA_VERSION}`,
        root.offset,
      ),
    );
    return;
  }

  const sliceId = readSliceId(value);
  const fileStem = readSliceFileStem(normalizedPath);
  if (sliceId.length === 0 || sliceId !== fileStem) {
    diagnostics.push(
      balanceDiagnostic(
        file,
        "BAL003_SLICE_ID_MISMATCH",
        `Balance sliceId ${JSON.stringify(sliceId)} must match the file stem ${JSON.stringify(fileStem)}`,
        root.offset,
      ),
    );
    return;
  }

  const validator = family === "quality" ? validateQualityBalance : validateSkillEvidenceBalance;
  if (!validator(value)) {
    diagnostics.push(...schemaBalanceDiagnostics(file, root, sliceId, validator.errors ?? []));
    return;
  }

  const semanticDiagnostics = validateBalanceSemantics(value, family, file, root, sliceId);
  if (semanticDiagnostics.length > 0) {
    diagnostics.push(...semanticDiagnostics);
    return;
  }

  if (family === "quality") {
    documents.push({
      path: normalizedPath,
      family,
      sliceId,
      document: value as QualityBalanceDocumentV1,
    });
    return;
  }
  documents.push({
    path: normalizedPath,
    family,
    sliceId,
    document: value as SkillEvidenceBalanceDocumentV1,
  });
}

function requireCompleteSlices(
  documents: readonly ValidatedBalanceDocumentV1[],
  diagnostics: BalanceDiagnostic[],
): readonly BalanceSliceCompilationV1[] {
  const qualityBySlice = new Map<string, QualityBalanceDocumentV1>();
  const skillEvidenceBySlice = new Map<string, SkillEvidenceBalanceDocumentV1>();

  for (const document of documents) {
    if (document.family === "quality") {
      const existing = qualityBySlice.get(document.sliceId);
      if (existing !== undefined) {
        diagnostics.push(duplicateFamilyDiagnostic(documents, document, "quality"));
        continue;
      }
      qualityBySlice.set(document.sliceId, document.document);
      continue;
    }

    const existing = skillEvidenceBySlice.get(document.sliceId);
    if (existing !== undefined) {
      diagnostics.push(duplicateFamilyDiagnostic(documents, document, "skill-evidence"));
      continue;
    }
    skillEvidenceBySlice.set(document.sliceId, document.document);
  }

  const sliceIds = [
    ...new Set([...qualityBySlice.keys(), ...skillEvidenceBySlice.keys()]),
  ].toSorted(compareText);
  for (const sliceId of sliceIds) {
    const quality = qualityBySlice.get(sliceId);
    const skillEvidence = skillEvidenceBySlice.get(sliceId);
    if (quality === undefined || skillEvidence === undefined) {
      diagnostics.push({
        code: "BAL001_INCOMPLETE_TABLE",
        message: `Balance slice ${JSON.stringify(sliceId)} is missing the ${
          quality === undefined
            ? QUALITY_BALANCE_SCHEMA_VERSION
            : SKILL_EVIDENCE_BALANCE_SCHEMA_VERSION
        } document`,
        path: "<balance-set>",
        line: 1,
        column: 1,
        sliceId,
      });
      continue;
    }
  }

  if (diagnostics.length > 0 || sliceIds.length === 0) {
    if (sliceIds.length === 0 && diagnostics.length === 0) {
      diagnostics.push({
        code: "BAL001_INCOMPLETE_TABLE",
        message: "Balance set contains no complete balance slices",
        path: "<balance-set>",
        line: 1,
        column: 1,
      });
    }
    return [];
  }

  return sliceIds.map((sliceId) => {
    const quality = qualityBySlice.get(sliceId);
    const skillEvidence = skillEvidenceBySlice.get(sliceId);
    if (quality === undefined || skillEvidence === undefined) {
      throw new TypeError(`Balance slice ${sliceId} lost its validated documents`);
    }
    return Object.freeze({ sliceId, quality, skillEvidence });
  });
}

function duplicateFamilyDiagnostic(
  documents: readonly ValidatedBalanceDocumentV1[],
  document: ValidatedBalanceDocumentV1,
  family: BalanceFamily,
): BalanceDiagnostic {
  const counterpart = documents.find(
    (candidate) => candidate.sliceId === document.sliceId && candidate.family === family,
  );
  return {
    code: "BAL004_DUPLICATE_FAMILY",
    message: `Balance slice ${JSON.stringify(document.sliceId)} declares more than one ${family} document${
      counterpart === undefined ? "" : ` (${counterpart.path})`
    }`,
    path: document.path,
    line: 1,
    column: 1,
    sliceId: document.sliceId,
  };
}

function readSliceFileStem(normalizedPath: string): string {
  const fileName = normalizedPath.split("/").at(-1) ?? "";
  return fileName.replace(/\.jsonc$/u, "");
}

function validateForbiddenProperties(
  file: ContentSourceFile,
  root: JsoncNode,
): BalanceDiagnostic[] {
  const diagnostics: BalanceDiagnostic[] = [];
  const pending: JsoncNode[] = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || current.type !== "object") continue;

    for (const property of current.children ?? []) {
      const keyNode = property.children?.[0];
      const valueNode = property.children?.[1];
      if (keyNode === undefined || typeof keyNode.value !== "string") continue;
      if (FORBIDDEN_PROPERTY_NAMES.has(keyNode.value)) {
        diagnostics.push(
          balanceDiagnostic(
            file,
            "BAL005_FORBIDDEN_PROPERTY",
            `Balance documents must not declare the ${JSON.stringify(keyNode.value)} property`,
            keyNode.offset,
          ),
        );
      }
      if (valueNode !== undefined) pending.push(valueNode);
    }
  }

  return diagnostics;
}

const FORBIDDEN_PROPERTY_NAMES = new Set(["__proto__", "constructor", "prototype"]);

function validateBalanceSemantics(
  value: unknown,
  family: BalanceFamily,
  file: ContentSourceFile,
  root: JsoncNode,
  sliceId: string,
): BalanceDiagnostic[] {
  if (family !== "quality") return [];
  const record = value as Readonly<Record<string, unknown>>;
  const outcomeRoll = record.outcomeRoll as Readonly<Record<string, unknown>> | undefined;
  const minimum = outcomeRoll?.minimum;
  const maximum = outcomeRoll?.maximum;
  if (typeof minimum !== "number" || typeof maximum !== "number" || minimum <= maximum) {
    return [];
  }
  const node = findNodeAtLocation(root, ["outcomeRoll"]) ?? root;
  const location = offsetLocation(file.text, node.offset);
  return [
    withSlice(
      {
        code: "BAL002_INVALID_RANGE",
        message: `Quality balance outcome roll minimum (${minimum}) must not exceed its maximum (${maximum})`,
        path: file.path,
        line: location.line,
        column: location.column,
        pointer: "/outcomeRoll",
      },
      sliceId,
    ),
  ];
}

function toPlainJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toPlainJson);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) result[key] = toPlainJson(item);
    return result;
  }
  return value;
}

function readBalanceFamily(value: unknown): BalanceFamily | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const schemaVersion = (value as Readonly<Record<string, unknown>>).schemaVersion;
  if (schemaVersion === QUALITY_BALANCE_SCHEMA_VERSION) return "quality";
  if (schemaVersion === SKILL_EVIDENCE_BALANCE_SCHEMA_VERSION) return "skill-evidence";
  return null;
}

function readSliceId(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "";
  const sliceId = (value as Readonly<Record<string, unknown>>).sliceId;
  return typeof sliceId === "string" ? sliceId : "";
}

function parseJsoncRoot(
  file: ContentSourceFile,
  diagnostics: BalanceDiagnostic[],
): JsoncNode | null {
  const parseErrors: ParseError[] = [];
  const root = parseTree(file.text, parseErrors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (root !== undefined && parseErrors.length === 0) return root;

  if (parseErrors.length === 0) {
    diagnostics.push(balanceDiagnostic(file, "JSONC_PARSE", "JSONC document is empty", 0));
    return null;
  }
  for (const error of parseErrors) {
    diagnostics.push(
      balanceDiagnostic(
        file,
        "JSONC_PARSE",
        `JSONC parse error: ${printParseErrorCode(error.error)}`,
        error.offset,
      ),
    );
  }
  return null;
}

function schemaBalanceDiagnostics(
  file: ContentSourceFile,
  root: JsoncNode,
  sliceId: string,
  errors: readonly ErrorObject[],
): BalanceDiagnostic[] {
  return errors.map((error) => {
    const path = pointerPath(error.instancePath);
    const node = findNodeAtLocation(root, [...path]) ?? root;
    const location = offsetLocation(file.text, node.offset);
    const suffix = error.message === undefined ? "" : ` ${error.message}`;
    return withSlice(
      {
        code: "SCHEMA_INVALID",
        message: `Schema ${error.instancePath || "/"}${suffix}`,
        path: file.path,
        line: location.line,
        column: location.column,
        ...(error.instancePath.length > 0 ? { pointer: error.instancePath } : {}),
      },
      sliceId,
    );
  });
}

function balanceDiagnostic(
  file: ContentSourceFile,
  code: BalanceDiagnosticCode,
  message: string,
  offset: number,
): BalanceDiagnostic {
  const location = offsetLocation(file.text, offset);
  return {
    code,
    message,
    path: file.path,
    line: location.line,
    column: location.column,
  };
}

function withSlice(
  diagnostic: Omit<BalanceDiagnostic, "sliceId">,
  sliceId: string,
): BalanceDiagnostic {
  return sliceId.length === 0 ? diagnostic : { ...diagnostic, sliceId };
}

function pointerPath(pointer: string): (string | number)[] {
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
