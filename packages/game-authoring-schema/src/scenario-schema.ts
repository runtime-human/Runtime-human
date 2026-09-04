import { Type, type Static } from "typebox";

export const SCENARIO_SCHEMA_VERSION = "scenario-v1" as const;
export const SCENARIO_IDENTIFIER_PATTERN = "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$" as const;
export const SCENARIO_DECISION_ID_PATTERN = "^[!-~]{1,128}$" as const;

const identifier = Type.String({
  pattern: SCENARIO_IDENTIFIER_PATTERN,
  minLength: 1,
  maxLength: 160,
});

const decisionId = Type.String({
  pattern: SCENARIO_DECISION_ID_PATTERN,
  minLength: 1,
  maxLength: 128,
});

const decisionNode = Type.Object(
  {
    kind: Type.Literal("decision"),
    decisionId,
    next: Type.Optional(identifier),
  },
  { additionalProperties: false },
);

const providerNode = Type.Object(
  {
    kind: Type.Literal("provider"),
    providerId: identifier,
    next: Type.Optional(identifier),
  },
  { additionalProperties: false },
);

const randomContentNode = Type.Object(
  {
    kind: Type.Literal("random-content"),
    poolId: identifier,
    next: Type.Optional(identifier),
  },
  { additionalProperties: false },
);

const gateNode = Type.Object(
  {
    kind: Type.Literal("gate"),
    predicateId: identifier,
    pass: Type.Optional(identifier),
    fail: Type.Optional(identifier),
  },
  { additionalProperties: false },
);

const branchCase = Type.Object(
  {
    predicateId: identifier,
    target: identifier,
  },
  { additionalProperties: false },
);

const branchNode = Type.Object(
  {
    kind: Type.Literal("branch"),
    branches: Type.Array(branchCase, { minItems: 1, maxItems: 8 }),
    fallback: Type.Optional(identifier),
  },
  { additionalProperties: false },
);

const completeNode = Type.Object(
  {
    kind: Type.Literal("complete"),
  },
  { additionalProperties: false },
);

const scenarioNode = Type.Union([
  decisionNode,
  providerNode,
  randomContentNode,
  gateNode,
  branchNode,
  completeNode,
]);

const ScenarioDocument = Type.Object(
  {
    schemaVersion: Type.Literal(SCENARIO_SCHEMA_VERSION),
    id: identifier,
    entry: identifier,
    nodes: Type.Record(identifier, scenarioNode, { minProperties: 1, maxProperties: 512 }),
  },
  { additionalProperties: false },
);

export type ScenarioAuthoringDocument = Static<typeof ScenarioDocument>;
export type ScenarioAuthoringNode = ScenarioAuthoringDocument["nodes"][string];

export const ScenarioAuthoringSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/scenario-v1",
  ...ScenarioDocument,
} as const;
