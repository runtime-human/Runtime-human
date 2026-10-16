import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import { getNodeValue, parseTree, printParseErrorCode, type Node as JsoncNode, type ParseError } from "jsonc-parser";

import { assertJanuaryV2ApproachBalance, type JanuaryV2ApproachTable } from "@runtime-human/game-core";

import type { BalanceDiagnostic } from "./balance-set";
import type { ContentSourceFile } from "./content-types";

export const JANUARY_V2_APPROACH_SOURCE_PATH = "balance/approach/january-1990-v2.jsonc";

export type JanuaryV2ApproachBalanceDocumentV1 = Readonly<{
  schemaVersion: "approach-balance-v1";
  sliceId: "january-1990-v2";
  approaches: JanuaryV2ApproachTable;
}>;

const rule = {
  type: "object",
  additionalProperties: false,
  required: ["finishThreshold", "quality", "participation", "cost", "learningValue"],
  properties: {
    finishThreshold: { type: "integer", minimum: 0, maximum: 10 },
    quality: { enum: ["basic", "adequate", "strong"] },
    participation: { enum: ["independent", "assisted"] },
    cost: { enum: ["completion-risk", "assistance", "known-limitation", "deferred-release"] },
    learningValue: { type: "integer", minimum: 0, maximum: 2 },
  },
} as const;

export const JANUARY_V2_APPROACH_BALANCE_SCHEMA_V1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/approach-balance-v1",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "sliceId", "approaches"],
  properties: {
    schemaVersion: { const: "approach-balance-v1" },
    sliceId: { const: "january-1990-v2" },
    approaches: {
      type: "object",
      additionalProperties: false,
      required: ["investigate-first", "ask-for-help", "reduce-scope", "defer-or-recover"],
      properties: {
        "investigate-first": { $ref: "#/$defs/rule" },
        "ask-for-help": { $ref: "#/$defs/rule" },
        "reduce-scope": { $ref: "#/$defs/rule" },
        "defer-or-recover": { $ref: "#/$defs/rule" },
      },
    },
  },
  $defs: { rule },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
const validate: ValidateFunction<JanuaryV2ApproachBalanceDocumentV1> =
  ajv.compile<JanuaryV2ApproachBalanceDocumentV1>(JANUARY_V2_APPROACH_BALANCE_SCHEMA_V1);

export type JanuaryV2ApproachCompilation =
  | Readonly<{ kind: "success"; document: JanuaryV2ApproachBalanceDocumentV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly BalanceDiagnostic[] }>;

/**
 * Separate compiler, shared diagnostic vocabulary. This intentionally does not
 * reinterpret the frozen January v1 quality/evidence families.
 */
export function compileJanuaryV2ApproachBalance(
  files: readonly ContentSourceFile[],
): JanuaryV2ApproachCompilation {
  if (files.length !== 1 || files[0]?.path !== JANUARY_V2_APPROACH_SOURCE_PATH) {
    return {
      kind: "failure",
      diagnostics: [{
        code: files.length > 1 ? "DUPLICATE_PATH" : "INVALID_PATH",
        message: "Exactly one canonical January v2 approach balance file is required",
        path: files[0]?.path ?? JANUARY_V2_APPROACH_SOURCE_PATH,
        line: 1,
        column: 1,
      }],
    };
  }
  const file = files[0];
  const errors: ParseError[] = [];
  const root = parseTree(file.text, errors, { allowTrailingComma: true, disallowComments: false });
  if (root === undefined || errors.length > 0) {
    return {
      kind: "failure",
      diagnostics: [{
        code: "JSONC_PARSE",
        message: errors.length > 0
          ? "JSONC parse: " + errors.map((error) => printParseErrorCode(error.error)).join(", ")
          : "Empty JSONC document",
        path: file.path,
        line: 1,
        column: 1,
      }],
    };
  }
  const invalidProperty = findInvalidProperty(root);
  if (invalidProperty !== null) {
    return {
      kind: "failure",
      diagnostics: [{
        code: "BAL005_FORBIDDEN_PROPERTY",
        message: "Duplicate or unsafe property: " + invalidProperty,
        path: file.path,
        line: 1,
        column: 1,
      }],
    };
  }
  const document: unknown = getNodeValue(root);
  if (!validate(document)) {
    return {
      kind: "failure",
      diagnostics: [{
        code: "SCHEMA_INVALID",
        message: "Approach schema: " + JSON.stringify(validate.errors ?? []),
        path: file.path,
        line: 1,
        column: 1,
      }],
    };
  }
  try {
    assertJanuaryV2ApproachBalance(document.approaches);
  } catch (error) {
    return {
      kind: "failure",
      diagnostics: [{
        code: "BAL006_APPROACH_SEMANTICS",
        message: error instanceof Error ? error.message : "Invalid approach semantics",
        path: file.path,
        line: 1,
        column: 1,
      }],
    };
  }
  return { kind: "success", document: Object.freeze(document) };
}

function findInvalidProperty(root: JsoncNode): string | null {
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === undefined || node.type !== "object") continue;
    const keys = new Set<string>();
    for (const property of node.children ?? []) {
      const key = property.children?.[0]?.value;
      if (typeof key !== "string") return "missing-key";
      if (keys.has(key) || key === "__proto__" || key === "constructor" || key === "prototype") {
        return key;
      }
      keys.add(key);
      const nested = property.children?.[1];
      if (nested !== undefined) {
        if (nested.type === "object") pending.push(nested);
        if (nested.type === "array") {
          for (const child of nested.children ?? []) pending.push(child);
        }
      }
    }
  }
  return null;
}
