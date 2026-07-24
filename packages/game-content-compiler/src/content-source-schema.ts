import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";

import type { ContentSourceDocumentV1 } from "./content-types";

export const CONTENT_COMPILER_VERSION = "content-compiler-v1" as const;

const IDENTIFIER_PATTERN = "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$";
const MONTH_PATTERN = "^[0-9]{4}-(0[1-9]|1[0-2])$";

export const CONTENT_SOURCE_SCHEMA_V1 = {
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

export const validateContentSource: ValidateFunction<ContentSourceDocumentV1> =
  ajv.compile<ContentSourceDocumentV1>(CONTENT_SOURCE_SCHEMA_V1);
