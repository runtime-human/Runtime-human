import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import { getNodeValue, parseTree, type Node as JsoncNode, type ParseError } from "jsonc-parser";

import type { JanuaryV2ContextBalance } from "@runtime-human/game-core";

import type { BalanceDiagnostic } from "./balance-set";
import type { ContentSourceFile } from "./content-types";

export const JANUARY_V2_CONTEXT_SOURCE_PATH = "balance/context/january-1990-v2.jsonc";

export type JanuaryV2ContextDocumentV1 = Readonly<{
  schemaVersion: "january-context-balance-v1";
  sliceId: "january-1990-v2";
}> &
  JanuaryV2ContextBalance;

const integer = { type: "integer", minimum: -2, maximum: 2 } as const;
const backgroundRow = {
  type: "object",
  additionalProperties: false,
  required: ["investigate-first", "ask-for-help"],
  properties: { "investigate-first": integer, "ask-for-help": integer },
} as const;
const learningRow = {
  type: "object",
  additionalProperties: false,
  required: ["finishModifier", "practiceOpportunityModifier"],
  properties: { finishModifier: integer, practiceOpportunityModifier: integer },
} as const;

export const JANUARY_V2_CONTEXT_SCHEMA_V1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/january-context-balance-v1",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "sliceId", "startBackground", "learningMode", "defect"],
  properties: {
    schemaVersion: { const: "january-context-balance-v1" },
    sliceId: { const: "january-1990-v2" },
    startBackground: {
      type: "object",
      additionalProperties: false,
      required: ["home-pc", "shared-school-pc"],
      properties: { "home-pc": backgroundRow, "shared-school-pc": backgroundRow },
    },
    learningMode: {
      type: "object",
      additionalProperties: false,
      required: ["read-and-run", "edit-and-debug"],
      properties: { "read-and-run": learningRow, "edit-and-debug": learningRow },
    },
    defect: {
      type: "object",
      additionalProperties: false,
      required: ["syntax-error", "logic-error"],
      properties: { "syntax-error": integer, "logic-error": integer },
    },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
const validate: ValidateFunction<JanuaryV2ContextDocumentV1> =
  ajv.compile<JanuaryV2ContextDocumentV1>(JANUARY_V2_CONTEXT_SCHEMA_V1);

export type JanuaryV2ContextCompilation =
  | Readonly<{ kind: "success"; document: JanuaryV2ContextDocumentV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly BalanceDiagnostic[] }>;

export function compileJanuaryV2ContextBalance(
  files: readonly ContentSourceFile[],
): JanuaryV2ContextCompilation {
  if (files.length !== 1 || files[0]?.path !== JANUARY_V2_CONTEXT_SOURCE_PATH) {
    return {
      kind: "failure",
      diagnostics: [
        {
          code: files.length > 1 ? "DUPLICATE_PATH" : "INVALID_PATH",
          message: "Exactly one canonical January v2 context file is required",
          path: files[0]?.path ?? JANUARY_V2_CONTEXT_SOURCE_PATH,
          line: 1,
          column: 1,
        },
      ],
    };
  }
  const file = files[0];
  const errors: ParseError[] = [];
  const root = parseTree(file.text, errors, { allowTrailingComma: true, disallowComments: false });
  if (root === undefined || errors.length > 0) {
    return {
      kind: "failure",
      diagnostics: [
        {
          code: "JSONC_PARSE",
          message: "Invalid or empty January v2 context JSONC",
          path: file.path,
          line: 1,
          column: 1,
        },
      ],
    };
  }
  const unsafe = findUnsafeProperty(root);
  if (unsafe !== null) {
    return {
      kind: "failure",
      diagnostics: [
        {
          code: "BAL005_FORBIDDEN_PROPERTY",
          message: "Duplicate or unsafe January v2 context key: " + unsafe,
          path: file.path,
          line: 1,
          column: 1,
        },
      ],
    };
  }
  const doc: unknown = getNodeValue(root);
  if (!validate(doc)) {
    return {
      kind: "failure",
      diagnostics: [
        {
          code: "SCHEMA_INVALID",
          message: "January v2 context schema: " + JSON.stringify(validate.errors ?? []),
          path: file.path,
          line: 1,
          column: 1,
        },
      ],
    };
  }
  return { kind: "success", document: Object.freeze(doc) };
}

function findUnsafeProperty(root: JsoncNode): string | null {
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
      if (nested?.type === "object") pending.push(nested);
    }
  }
  return null;
}
