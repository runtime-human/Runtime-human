import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import {
  QUALITY_BALANCE_SCHEMA_V1,
  SKILL_EVIDENCE_BALANCE_SCHEMA_V1,
  type QualityBalanceDocumentV1,
  type SkillEvidenceBalanceDocumentV1,
} from "@runtime-human/game-content-compiler";
import {
  QualityBalanceAuthoringSchemaV1,
  SkillEvidenceBalanceAuthoringSchemaV1,
  type QualityBalanceAuthoringDocument,
  type SkillEvidenceBalanceAuthoringDocument,
} from "@runtime-human/game-authoring-schema";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function compile(schema: object): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  return ajv.compile(schema);
}

const validateExistingQuality = compile(QUALITY_BALANCE_SCHEMA_V1);
const validateGeneratedQuality = compile(QualityBalanceAuthoringSchemaV1 as object);
const validateExistingEvidence = compile(SKILL_EVIDENCE_BALANCE_SCHEMA_V1);
const validateGeneratedEvidence = compile(SkillEvidenceBalanceAuthoringSchemaV1 as object);

function assertParity(
  family: "quality" | "skill-evidence",
  document: unknown,
  label: string,
): void {
  const existing = family === "quality" ? validateExistingQuality : validateExistingEvidence;
  const generated = family === "quality" ? validateGeneratedQuality : validateGeneratedEvidence;
  expect(existing(document), `${label}: existing schema decision`).toBe(generated(document));
}

const VALID_QUALITY: QualityBalanceDocumentV1 = {
  schemaVersion: "quality-balance-v1",
  sliceId: "january-1990",
  base: { clarity: 3, correctness: 3, reliability: 3 },
  access: {
    "home-pc": { clarity: 0, correctness: 0, reliability: 2 },
    "shared-school-pc": { clarity: 0, correctness: 0, reliability: 1 },
  },
  learning: {
    "read-and-run": { clarity: 2, correctness: 2, reliability: 0 },
    "edit-and-debug": { clarity: 3, correctness: 3, reliability: 0 },
  },
  defectResponse: {
    "inspect-listing": { clarity: 2, correctness: 3, reliability: 1 },
    "change-input": { clarity: 1, correctness: 2, reliability: 2 },
    "ask-for-guidance": { clarity: 1, correctness: 1, reliability: 1 },
  },
  outcomeRoll: { minimum: 0, maximum: 2 },
};

const VALID_EVIDENCE: SkillEvidenceBalanceDocumentV1 = {
  schemaVersion: "skill-evidence-balance-v1",
  sliceId: "january-1990",
  programWriting: { "read-and-run": 1, "edit-and-debug": 2 },
  debugging: { "inspect-listing": 2, "change-input": 2, "ask-for-guidance": 1 },
  toolUse: { "home-pc": 2, "shared-school-pc": 1 },
};

function mutatedQuality(
  label: string,
  mutate: (document: QualityBalanceDocumentV1) => unknown,
): { label: string; document: unknown } {
  return { label, document: mutate(structuredClone(VALID_QUALITY)) };
}

function mutatedEvidence(
  label: string,
  mutate: (document: SkillEvidenceBalanceDocumentV1) => unknown,
): { label: string; document: unknown } {
  return { label, document: mutate(structuredClone(VALID_EVIDENCE)) };
}

const QUALITY_FIELDS = [
  "schemaVersion",
  "sliceId",
  "base",
  "access",
  "learning",
  "defectResponse",
  "outcomeRoll",
] as const;

const EVIDENCE_FIELDS = [
  "schemaVersion",
  "sliceId",
  "programWriting",
  "debugging",
  "toolUse",
] as const;

const missingQualityField = QUALITY_FIELDS.map((field) =>
  mutatedQuality(`missing ${field}`, (document) => {
    const clone = document as Record<string, unknown>;
    delete clone[field];
    return clone;
  }),
);

const missingEvidenceField = EVIDENCE_FIELDS.map((field) =>
  mutatedEvidence(`missing ${field}`, (document) => {
    const clone = document as Record<string, unknown>;
    delete clone[field];
    return clone;
  }),
);

const QUALITY_REJECTIONS = [
  ...missingQualityField,
  mutatedQuality("wrong schemaVersion", (document) => ({
    ...document,
    schemaVersion: "quality-balance-v2",
  })),
  mutatedQuality("uppercase sliceId", (document) => ({ ...document, sliceId: "January-1990" })),
  mutatedQuality("space in sliceId", (document) => ({ ...document, sliceId: "january 1990" })),
  mutatedQuality("base clarity above 100", (document) => ({
    ...document,
    base: { ...document.base, clarity: 101 },
  })),
  mutatedQuality("negative base clarity", (document) => ({
    ...document,
    base: { ...document.base, clarity: -1 },
  })),
  mutatedQuality("float base clarity", (document) => ({
    ...document,
    base: { ...document.base, clarity: 1.5 },
  })),
  mutatedQuality("string base correctness", (document) => ({
    ...document,
    base: { ...document.base, correctness: "3" },
  })),
  mutatedQuality("incomplete base dimensions", (document) => ({
    ...document,
    base: { clarity: 3, correctness: 3 },
  })),
  mutatedQuality("access reliability above 10", (document) => ({
    ...document,
    access: {
      ...document.access,
      "home-pc": { ...document.access["home-pc"], reliability: 11 },
    },
  })),
  mutatedQuality("negative access modifier", (document) => ({
    ...document,
    access: {
      ...document.access,
      "shared-school-pc": { ...document.access["shared-school-pc"], clarity: -1 },
    },
  })),
  mutatedQuality("unknown learning practice", (document) => ({
    ...document,
    learning: {
      ...document.learning,
      "watch-and-learn": { clarity: 1, correctness: 1, reliability: 1 },
    },
  })),
  mutatedQuality("incomplete learning table", (document) => ({
    ...document,
    learning: { "edit-and-debug": document.learning["edit-and-debug"] },
  })),
  mutatedQuality("incomplete defect dimensions", (document) => ({
    ...document,
    defectResponse: {
      ...document.defectResponse,
      "ask-for-guidance": { clarity: 1, correctness: 1 },
    },
  })),
  mutatedQuality("incomplete defect table", (document) => ({
    ...document,
    defectResponse: {
      "inspect-listing": document.defectResponse["inspect-listing"],
      "change-input": document.defectResponse["change-input"],
    },
  })),
  mutatedQuality("negative roll minimum", (document) => ({
    ...document,
    outcomeRoll: { minimum: -1, maximum: 2 },
  })),
  mutatedQuality("roll maximum above 10", (document) => ({
    ...document,
    outcomeRoll: { minimum: 0, maximum: 11 },
  })),
  mutatedQuality("extra top-level property", (document) => ({
    ...document,
    futureField: true,
  })),
  mutatedQuality("array base", (document) => ({ ...document, base: [] })),
  mutatedQuality("null document", () => null),
];

const EVIDENCE_REJECTIONS = [
  ...missingEvidenceField,
  mutatedEvidence("wrong schemaVersion", (document) => ({
    ...document,
    schemaVersion: "skill-evidence-balance-v2",
  })),
  mutatedEvidence("numeric sliceId", (document) => ({ ...document, sliceId: 1990 })),
  mutatedEvidence("zero evidence amount", (document) => ({
    ...document,
    programWriting: { ...document.programWriting, "read-and-run": 0 },
  })),
  mutatedEvidence("evidence amount above 10", (document) => ({
    ...document,
    programWriting: { ...document.programWriting, "edit-and-debug": 11 },
  })),
  mutatedEvidence("float evidence amount", (document) => ({
    ...document,
    debugging: { ...document.debugging, "change-input": 2.5 },
  })),
  mutatedEvidence("incomplete toolUse table", (document) => ({
    ...document,
    toolUse: { "home-pc": 2 },
  })),
  mutatedEvidence("unknown access route", (document) => ({
    ...document,
    toolUse: { ...document.toolUse, "office-pc": 2 },
  })),
  mutatedEvidence("string evidence amount", (document) => ({
    ...document,
    debugging: { ...document.debugging, "ask-for-guidance": "1" },
  })),
  mutatedEvidence("extra top-level property", (document) => ({
    ...document,
    extraField: 1,
  })),
  mutatedEvidence("empty programWriting table", (document) => ({
    ...document,
    programWriting: {},
  })),
];

describe("authoring schema equivalence (balance families)", () => {
  it("uses JSON Schema 2020-12 with stable identifiers", () => {
    for (const schema of [QualityBalanceAuthoringSchemaV1, SkillEvidenceBalanceAuthoringSchemaV1]) {
      const candidate = schema as Readonly<Record<string, unknown>>;
      expect(candidate.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(candidate.$id).toMatch(/^https:\/\/runtime-human\.invalid\/schema\//u);
    }
  });

  it("accepts the committed balance documents identically", async () => {
    const quality = parseJsonc(
      await readFile(join(repositoryRoot, "balance", "quality", "january-1990.jsonc"), "utf8"),
    );
    const evidence = parseJsonc(
      await readFile(
        join(repositoryRoot, "balance", "skill-evidence", "january-1990.jsonc"),
        "utf8",
      ),
    );

    assertParity("quality", quality, "balance/quality/january-1990.jsonc");
    assertParity("skill-evidence", evidence, "balance/skill-evidence/january-1990.jsonc");
    expect(validateGeneratedQuality(quality)).toBe(true);
    expect(validateGeneratedEvidence(evidence)).toBe(true);
  });

  it("rejects the same invalid quality documents as the existing compiler schema", () => {
    expect(QUALITY_REJECTIONS.length).toBeGreaterThanOrEqual(20);
    for (const { label, document } of QUALITY_REJECTIONS) {
      assertParity("quality", document, label);
      expect(validateGeneratedQuality(document), `${label}: generated rejection`).toBe(false);
    }
  });

  it("rejects the same invalid skill-evidence documents as the existing compiler schema", () => {
    expect(EVIDENCE_REJECTIONS.length).toBeGreaterThanOrEqual(15);
    for (const { label, document } of EVIDENCE_REJECTIONS) {
      assertParity("skill-evidence", document, label);
      expect(validateGeneratedEvidence(document), `${label}: generated rejection`).toBe(false);
    }
  });

  it("accepts documents typed by the generated Static types", () => {
    const staticQuality: QualityBalanceAuthoringDocument = VALID_QUALITY;
    const staticEvidence: SkillEvidenceBalanceAuthoringDocument = VALID_EVIDENCE;
    assertParity("quality", staticQuality, "static-typed quality document");
    assertParity("skill-evidence", staticEvidence, "static-typed skill-evidence document");
    expect(validateExistingQuality(staticQuality)).toBe(true);
    expect(validateExistingEvidence(staticEvidence)).toBe(true);
  });
});
