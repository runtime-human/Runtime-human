import { Type, type Static } from "typebox";

export const QUALITY_BALANCE_SCHEMA_VERSION = "quality-balance-v1" as const;
export const SKILL_EVIDENCE_BALANCE_SCHEMA_VERSION = "skill-evidence-balance-v1" as const;

const identifier = Type.String({
  pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$",
  minLength: 1,
  maxLength: 160,
});

const baseScores = Type.Object(
  {
    clarity: Type.Integer({ minimum: 0, maximum: 100 }),
    correctness: Type.Integer({ minimum: 0, maximum: 100 }),
    reliability: Type.Integer({ minimum: 0, maximum: 100 }),
  },
  { additionalProperties: false },
);

const qualityModifiers = Type.Object(
  {
    clarity: Type.Integer({ minimum: 0, maximum: 10 }),
    correctness: Type.Integer({ minimum: 0, maximum: 10 }),
    reliability: Type.Integer({ minimum: 0, maximum: 10 }),
  },
  { additionalProperties: false },
);

const outcomeRoll = Type.Object(
  {
    minimum: Type.Integer({ minimum: 0, maximum: 10 }),
    maximum: Type.Integer({ minimum: 0, maximum: 10 }),
  },
  { additionalProperties: false },
);

const accessTable = Type.Object(
  {
    "home-pc": Type.Ref("#/$defs/qualityModifiers"),
    "shared-school-pc": Type.Ref("#/$defs/qualityModifiers"),
  },
  { additionalProperties: false },
);

const learningTable = Type.Object(
  {
    "read-and-run": Type.Ref("#/$defs/qualityModifiers"),
    "edit-and-debug": Type.Ref("#/$defs/qualityModifiers"),
  },
  { additionalProperties: false },
);

const defectResponseTable = Type.Object(
  {
    "inspect-listing": Type.Ref("#/$defs/qualityModifiers"),
    "change-input": Type.Ref("#/$defs/qualityModifiers"),
    "ask-for-guidance": Type.Ref("#/$defs/qualityModifiers"),
  },
  { additionalProperties: false },
);

const QualityBalanceDocument = Type.Object(
  {
    schemaVersion: Type.Literal("quality-balance-v1"),
    sliceId: Type.Ref("#/$defs/identifier"),
    base: Type.Ref("#/$defs/baseScores"),
    access: Type.Ref("#/$defs/accessTable"),
    learning: Type.Ref("#/$defs/learningTable"),
    defectResponse: Type.Ref("#/$defs/defectResponseTable"),
    outcomeRoll: Type.Ref("#/$defs/outcomeRoll"),
  },
  { additionalProperties: false },
);

export type QualityBalanceAuthoringDocument = Static<typeof QualityBalanceDocument>;

export const QualityBalanceAuthoringSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/quality-balance-v1",
  $defs: {
    identifier,
    baseScores,
    qualityModifiers,
    outcomeRoll,
    accessTable,
    learningTable,
    defectResponseTable,
  },
  ...QualityBalanceDocument,
} as const;

const evidenceAmount = Type.Integer({ minimum: 1, maximum: 10 });

const learningAmountTable = Type.Object(
  {
    "read-and-run": Type.Ref("#/$defs/evidenceAmount"),
    "edit-and-debug": Type.Ref("#/$defs/evidenceAmount"),
  },
  { additionalProperties: false },
);

const defectResponseAmountTable = Type.Object(
  {
    "inspect-listing": Type.Ref("#/$defs/evidenceAmount"),
    "change-input": Type.Ref("#/$defs/evidenceAmount"),
    "ask-for-guidance": Type.Ref("#/$defs/evidenceAmount"),
  },
  { additionalProperties: false },
);

const accessAmountTable = Type.Object(
  {
    "home-pc": Type.Ref("#/$defs/evidenceAmount"),
    "shared-school-pc": Type.Ref("#/$defs/evidenceAmount"),
  },
  { additionalProperties: false },
);

const SkillEvidenceBalanceDocument = Type.Object(
  {
    schemaVersion: Type.Literal("skill-evidence-balance-v1"),
    sliceId: Type.Ref("#/$defs/identifier"),
    programWriting: Type.Ref("#/$defs/learningAmountTable"),
    debugging: Type.Ref("#/$defs/defectResponseAmountTable"),
    toolUse: Type.Ref("#/$defs/accessAmountTable"),
  },
  { additionalProperties: false },
);

export type SkillEvidenceBalanceAuthoringDocument = Static<typeof SkillEvidenceBalanceDocument>;

export const SkillEvidenceBalanceAuthoringSchemaV1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://runtime-human.invalid/schema/skill-evidence-balance-v1",
  $defs: {
    identifier,
    evidenceAmount,
    learningAmountTable,
    defectResponseAmountTable,
    accessAmountTable,
  },
  ...SkillEvidenceBalanceDocument,
} as const;
