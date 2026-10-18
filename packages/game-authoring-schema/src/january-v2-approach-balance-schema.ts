import { Type, type Static } from "typebox";

const approachRule = Type.Object(
  {
    finishThreshold: Type.Integer({ minimum: 0, maximum: 10 }),
    quality: Type.Union([Type.Literal("basic"), Type.Literal("adequate"), Type.Literal("strong")]),
    participation: Type.Union([Type.Literal("independent"), Type.Literal("assisted")]),
    cost: Type.Union([
      Type.Literal("completion-risk"),
      Type.Literal("assistance"),
      Type.Literal("known-limitation"),
      Type.Literal("deferred-release"),
    ]),
    learningValue: Type.Integer({ minimum: 0, maximum: 2 }),
  },
  { additionalProperties: false },
);

const approachTable = Type.Object(
  {
    "investigate-first": Type.Ref("#/$defs/approachRule"),
    "ask-for-help": Type.Ref("#/$defs/approachRule"),
    "reduce-scope": Type.Ref("#/$defs/approachRule"),
    "defer-or-recover": Type.Ref("#/$defs/approachRule"),
  },
  { additionalProperties: false },
);

const document = Type.Object(
  {
    schemaVersion: Type.Literal("approach-balance-v1"),
    sliceId: Type.Literal("january-1990-v2"),
    approaches: Type.Ref("#/$defs/approachTable"),
  },
  { additionalProperties: false },
);

export type JanuaryV2ApproachBalanceAuthoringDocument = Static<typeof document>;

export const JanuaryV2ApproachBalanceAuthoringSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/approach-balance-v1",
  $defs: { approachRule, approachTable },
  ...document,
} as const;
