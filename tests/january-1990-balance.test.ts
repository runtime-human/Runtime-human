import { describe, expect, it } from "vitest";

import {
  compileBalanceSet,
  type ContentSourceFile,
  type QualityBalanceDocumentV1,
  type SkillEvidenceBalanceDocumentV1,
} from "@runtime-human/game-content-compiler";
import {
  createJanuary1990BalanceFingerprint,
  createJanuary1990Result,
  createJanuary1990RulesFingerprint,
  createJanuary1990RulesetManifest,
  deriveJanuaryQualityScoreMaximums,
  fingerprint,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_QUALITY_SCORE_MAXIMUMS,
  materializeJanuaryProgrammingState,
  parseJanuary1990Balance,
  type JanuaryProgrammingOutcomeV1,
} from "@runtime-human/game-core";

import { loadJanuary1990CompiledBalance } from "./helpers/january-1990-balance";

const ACCESS_ROUTES = ["home-pc", "shared-school-pc"] as const;
const LEARNING_PRACTICES = ["read-and-run", "edit-and-debug"] as const;
const DEFECT_RESPONSES = ["inspect-listing", "change-input", "ask-for-guidance"] as const;
const OUTCOME_ROLLS = [0, 1, 2] as const;

describe("January 1990 balance layer", () => {
  it("compiles the committed balance files into the canonical default balance", async () => {
    const compiled = await loadJanuary1990CompiledBalance();

    expect(compiled).toEqual(JANUARY_1990_DEFAULT_BALANCE);
    expect(createJanuary1990BalanceFingerprint(compiled)).toBe(
      createJanuary1990BalanceFingerprint(JANUARY_1990_DEFAULT_BALANCE),
    );
  });

  it("derives quality score maxima exactly from the closed tables", () => {
    expect(deriveJanuaryQualityScoreMaximums(JANUARY_1990_DEFAULT_BALANCE.quality)).toEqual({
      clarity: 10,
      correctness: 11,
      reliability: 9,
    });
    expect(JANUARY_1990_QUALITY_SCORE_MAXIMUMS).toEqual({
      clarity: 10,
      correctness: 11,
      reliability: 9,
    });
  });

  it("keeps every composed outcome within the derived maxima", () => {
    const maxima = deriveJanuaryQualityScoreMaximums(JANUARY_1990_DEFAULT_BALANCE.quality);
    const attained = { clarity: 0, correctness: 0, reliability: 0 };

    for (const accessRoute of ACCESS_ROUTES) {
      for (const learningPractice of LEARNING_PRACTICES) {
        for (const defectResponse of DEFECT_RESPONSES) {
          for (const outcomeRoll of OUTCOME_ROLLS) {
            const state = {
              schemaVersion: "january-1990-provisional-state-v1",
              accessRoute,
              learningPractice,
              defectResponse,
              workPackageId: null,
              defectEventId: null,
              evidence: [],
              qualityScores: null,
            } as const;
            const materialized = materializeJanuaryProgrammingState(
              state,
              outcomeRoll,
              JANUARY_1990_DEFAULT_BALANCE,
            );
            for (const dimension of ["clarity", "correctness", "reliability"] as const) {
              const score = materialized.qualityScores[dimension];
              expect(score).toBeLessThanOrEqual(maxima[dimension]);
              attained[dimension] = Math.max(attained[dimension], score);
            }
          }
        }
      }
    }

    expect(attained).toEqual(maxima);
  });

  it("rejects an incomplete balance set", () => {
    const compilation = compileBalanceSet([qualityBalanceFile()]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "BAL001_INCOMPLETE_TABLE",
    );
  });

  it("rejects an incomplete enum table", () => {
    const document = qualityBalanceDocument();
    const incomplete = {
      ...document,
      defectResponse: {
        "inspect-listing": document.defectResponse["inspect-listing"],
        "change-input": document.defectResponse["change-input"],
      },
    };
    const compilation = compileBalanceSet([qualityBalanceFile(incomplete), skillEvidenceFile()]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "SCHEMA_INVALID",
    );
    expect(() =>
      parseJanuary1990Balance(toCoreBalance(incomplete, skillEvidenceDocument())),
    ).toThrowError(/closed contract/u);
  });

  it("rejects an invalid modifier range", () => {
    const document = qualityBalanceDocument();
    const outOfRange = {
      ...document,
      base: { ...document.base, clarity: 101 },
    };
    const compilation = compileBalanceSet([qualityBalanceFile(outOfRange), skillEvidenceFile()]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "SCHEMA_INVALID",
    );

    const coreValue = toCoreBalance(outOfRange, skillEvidenceDocument());
    expect(() => parseJanuary1990Balance(coreValue)).toThrowError(RangeError);
  });

  it("rejects an outcome roll minimum above its maximum", () => {
    const document = qualityBalanceDocument();
    const inverted = {
      ...document,
      outcomeRoll: { minimum: 2, maximum: 1 },
    };
    const compilation = compileBalanceSet([qualityBalanceFile(inverted), skillEvidenceFile()]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "BAL002_INVALID_RANGE",
    );
    expect(() =>
      parseJanuary1990Balance(toCoreBalance(inverted, skillEvidenceDocument())),
    ).toThrowError(RangeError);
  });

  it("rejects out-of-range evidence amounts", () => {
    const document = skillEvidenceDocument();
    const zero = { ...document, toolUse: { ...document.toolUse, "home-pc": 0 } };
    expect(() =>
      parseJanuary1990Balance(toCoreBalance(qualityBalanceDocument(), zero)),
    ).toThrowError(RangeError);
  });

  it("moves the balance and rules fingerprints when balance changes", () => {
    const changed = parseJanuary1990Balance({
      ...structuredClone(toRecord(JANUARY_1990_DEFAULT_BALANCE)),
      quality: {
        ...structuredClone(toRecord(JANUARY_1990_DEFAULT_BALANCE.quality)),
        base: { clarity: 4, correctness: 3, reliability: 3 },
      },
    });

    const defaultBalanceFingerprint = createJanuary1990BalanceFingerprint(
      JANUARY_1990_DEFAULT_BALANCE,
    );
    const changedBalanceFingerprint = createJanuary1990BalanceFingerprint(changed);
    expect(changedBalanceFingerprint).not.toBe(defaultBalanceFingerprint);
    expect(changedBalanceFingerprint).toMatch(/^[0-9a-f]{64}$/u);

    expect(createJanuary1990RulesFingerprint(changed)).not.toBe(
      createJanuary1990RulesFingerprint(JANUARY_1990_DEFAULT_BALANCE),
    );
  });

  it("publishes a closed ruleset manifest that ignores non-gameplay changes", () => {
    const contentFingerprint = fingerprint("january-1990-balance-test", { fixture: "content" });
    const manifest = createJanuary1990RulesetManifest({
      contentFingerprint,
      balance: JANUARY_1990_DEFAULT_BALANCE,
    });

    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.keys(manifest).toSorted()).toEqual([
      "balanceFingerprint",
      "contentFingerprint",
      "coreRulesVersion",
      "scenarioFingerprint",
      "schemaVersion",
    ]);
    expect(manifest.schemaVersion).toBe("january-1990-ruleset-manifest-v1");
    expect(manifest.coreRulesVersion).toBe("january-1990-step-table-v1");
    expect(manifest.contentFingerprint).toBe(contentFingerprint);
    expect(manifest.balanceFingerprint).toBe(
      createJanuary1990BalanceFingerprint(JANUARY_1990_DEFAULT_BALANCE),
    );
    expect(manifest.scenarioFingerprint).toBeNull();

    expect(
      createJanuary1990RulesetManifest({
        contentFingerprint,
        balance: JANUARY_1990_DEFAULT_BALANCE,
      }),
    ).toEqual(manifest);
  });

  it("validates materialized results against the active balance, not the save-contract default", () => {
    const raised = parseJanuary1990Balance({
      ...structuredClone(toRecord(JANUARY_1990_DEFAULT_BALANCE)),
      quality: {
        ...structuredClone(toRecord(JANUARY_1990_DEFAULT_BALANCE.quality)),
        base: { clarity: 4, correctness: 3, reliability: 3 },
      },
    });
    const raisedMaxima = deriveJanuaryQualityScoreMaximums(raised.quality);
    expect(raisedMaxima.clarity).toBe(11);

    const materialized = materializeJanuaryProgrammingState(provisionalState(), 2, raised);
    expect(materialized.qualityScores.clarity).toBe(11);

    const raisedResult: JanuaryProgrammingOutcomeV1 = {
      schemaVersion: "january-1990-programming-outcome-v1",
      month: "1990-01",
      projectId: JANUARY_1990_CONTENT_IDS.personalUtilityProject,
      workPackageId: JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
      defectEventId: JANUARY_1990_CONTENT_IDS.logicErrorEvent,
      outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
      accessRoute: "home-pc",
      learningPractice: "edit-and-debug",
      defectResponse: "inspect-listing",
      qualityScores: materialized.qualityScores,
      evidence: materialized.evidence,
    };
    expect(() => createJanuary1990Result(raisedResult, raisedMaxima)).not.toThrow();
    expect(() => createJanuary1990Result(raisedResult)).toThrowError(/between 0 and 10/u);
  });

  it("rejects a balance file whose sliceId does not match the file stem", () => {
    const compilation = compileBalanceSet([
      { path: "balance/quality/foo.jsonc", text: JSON.stringify(qualityBalanceDocument()) },
      skillEvidenceFile(),
    ]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "BAL003_SLICE_ID_MISMATCH",
    );
  });

  it("rejects a duplicate balance family for one slice", () => {
    const compilation = compileBalanceSet([
      qualityBalanceFile(),
      {
        path: "balance/quality/nested/january-1990.jsonc",
        text: JSON.stringify(qualityBalanceDocument()),
      },
      skillEvidenceFile(),
    ]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "BAL004_DUPLICATE_FAMILY",
    );
  });

  it("rejects a duplicate balance source path", () => {
    const compilation = compileBalanceSet([qualityBalanceFile(), qualityBalanceFile()]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "DUPLICATE_PATH",
    );
  });

  it("rejects forbidden JSONC properties", () => {
    const text = JSON.stringify(qualityBalanceDocument()).replace(
      '"schemaVersion"',
      '"__proto__":{"polluted":true},"schemaVersion"',
    );
    const compilation = compileBalanceSet([
      { path: "balance/quality/january-1990.jsonc", text },
      skillEvidenceFile(),
    ]);
    expect(compilation.kind).toBe("failure");
    if (compilation.kind !== "failure") return;
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "BAL005_FORBIDDEN_PROPERTY",
    );
  });
});

function toRecord<T>(value: T): T & Record<string, unknown> {
  return value as T & Record<string, unknown>;
}

function provisionalState() {
  return {
    schemaVersion: "january-1990-provisional-state-v1",
    accessRoute: "home-pc",
    learningPractice: "edit-and-debug",
    defectResponse: "inspect-listing",
    workPackageId: null,
    defectEventId: null,
    evidence: [],
    qualityScores: null,
  } as const;
}

function toCoreBalance(quality: object, skillEvidence: object): Record<string, unknown> {
  const {
    schemaVersion: _schemaVersion,
    sliceId: _sliceId,
    ...qualityBody
  } = quality as Record<string, unknown>;
  const {
    schemaVersion: _evidenceSchemaVersion,
    sliceId: _evidenceSliceId,
    ...evidenceBody
  } = skillEvidence as Record<string, unknown>;
  return {
    schemaVersion: "january-1990-balance-v1",
    sliceId: "january-1990",
    quality: qualityBody,
    skillEvidence: evidenceBody,
  };
}

function qualityBalanceFile(document: unknown = qualityBalanceDocument()): ContentSourceFile {
  return { path: "balance/quality/january-1990.jsonc", text: JSON.stringify(document) };
}

function skillEvidenceFile(): ContentSourceFile {
  return {
    path: "balance/skill-evidence/january-1990.jsonc",
    text: JSON.stringify(skillEvidenceDocument()),
  };
}

function qualityBalanceDocument(): QualityBalanceDocumentV1 {
  return {
    schemaVersion: "quality-balance-v1",
    sliceId: "january-1990",
    ...structuredClone(toRecord(JANUARY_1990_DEFAULT_BALANCE.quality)),
  };
}

function skillEvidenceDocument(): SkillEvidenceBalanceDocumentV1 {
  return {
    schemaVersion: "skill-evidence-balance-v1",
    sliceId: "january-1990",
    ...structuredClone(toRecord(JANUARY_1990_DEFAULT_BALANCE.skillEvidence)),
  };
}
