import { Type, type Static } from "typebox";

export const CONTENT_SOURCE_AUTHORING_SCHEMA_VERSION = "content-source-v1" as const;

const identifier = Type.String({
  pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$",
  minLength: 1,
  maxLength: 160,
});

const chunkSegment = Type.String({
  pattern: "^[a-z0-9][a-z0-9]*(?:[.-][a-z0-9]+)*$",
  minLength: 1,
  maxLength: 80,
});

const month = Type.String({ pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" });

const authoritativeValue: TypeRef = Type.Union([
  Type.Null(),
  Type.Boolean(),
  Type.String(),
  Type.Integer({
    minimum: Number.MIN_SAFE_INTEGER,
    maximum: Number.MAX_SAFE_INTEGER,
  }),
  Type.Array(Type.Ref("#/$defs/authoritativeValue")),
  Type.Object({}, { additionalProperties: Type.Ref("#/$defs/authoritativeValue") }),
]);

type TypeRef = ReturnType<typeof Type.Union>;

const provenance = Type.Object(
  {
    sourceId: Type.Ref("#/$defs/identifier"),
    title: Type.String({ minLength: 1, maxLength: 500 }),
    locator: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
  },
  { additionalProperties: false },
);

const ContentSourceDocument = Type.Object(
  {
    schemaVersion: Type.Literal("content-source-v1"),
    id: Type.Ref("#/$defs/identifier"),
    kind: Type.Union([
      Type.Literal("event"),
      Type.Literal("reference"),
      Type.Literal("storylet"),
      Type.Literal("technology"),
    ]),
    domain: Type.Ref("#/$defs/identifier"),
    era: Type.Ref("#/$defs/chunkSegment"),
    availableFrom: Type.Ref("#/$defs/month"),
    availableTo: Type.Optional(Type.Ref("#/$defs/month")),
    entryPoint: Type.Boolean(),
    references: Type.Array(Type.Ref("#/$defs/identifier"), { uniqueItems: true }),
    provenance: Type.Array(provenance, { minItems: 1 }),
    payload: Type.Ref("#/$defs/authoritativeValue"),
  },
  { additionalProperties: false },
);

export type ContentSourceAuthoringDocument = Static<typeof ContentSourceDocument>;

export const ContentSourceAuthoringSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/content-source-v1",
  $defs: {
    identifier,
    chunkSegment,
    month,
    provenance,
    authoritativeValue,
  },
  ...ContentSourceDocument,
} as const;
