import { Type, type Static } from "typebox";

const backgroundRow = Type.Object(
  {
    "investigate-first": Type.Integer({ minimum: -2, maximum: 2 }),
    "ask-for-help": Type.Integer({ minimum: -2, maximum: 2 }),
  },
  { additionalProperties: false },
);
const learningRow = Type.Object(
  {
    finishModifier: Type.Integer({ minimum: -2, maximum: 2 }),
    practiceOpportunityModifier: Type.Integer({ minimum: -2, maximum: 2 }),
  },
  { additionalProperties: false },
);

const contextDocument = Type.Object(
  {
    schemaVersion: Type.Literal("january-context-balance-v1"),
    sliceId: Type.Literal("january-1990-v2"),
    startBackground: Type.Object(
      {
        "home-pc": Type.Ref("#/$defs/backgroundRow"),
        "shared-school-pc": Type.Ref("#/$defs/backgroundRow"),
      },
      { additionalProperties: false },
    ),
    learningMode: Type.Object(
      {
        "read-and-run": Type.Ref("#/$defs/learningRow"),
        "edit-and-debug": Type.Ref("#/$defs/learningRow"),
      },
      { additionalProperties: false },
    ),
    defect: Type.Object(
      {
        "syntax-error": Type.Integer({ minimum: -2, maximum: 2 }),
        "logic-error": Type.Integer({ minimum: -2, maximum: 2 }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type JanuaryV2ContextAuthoringDocument = Static<typeof contextDocument>;

export const JanuaryV2ContextAuthoringSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/january-context-balance-v1",
  $defs: { backgroundRow, learningRow },
  ...contextDocument,
} as const;
