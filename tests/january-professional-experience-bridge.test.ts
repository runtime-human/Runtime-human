import { describe, expect, it } from "vitest";

import {
  createCanonicalPayload,
  createJanuary1990InitialSaveSnapshot,
  createJanuaryProfessionalLabEpisodeV1,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  projectCommittedJanuaryProfessionalSourceV1,
  type JanuaryProfessionalLabAssessmentV1,
} from "@runtime-human/game-application";
import {
  applyProfessionalExperienceLabV1,
  createProfessionalLabStateV1,
  fingerprint,
  JANUARY_1990_CONTENT_IDS,
} from "@runtime-human/game-core";
import { parseMonthRunId, parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";
import type { SaveRecordV1 } from "@runtime-human/game-persistence-contracts";

import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";

function storedOutcome(id: string, scope: string) {
  const payload = { marker: id };
  return {
    outcomeId: id,
    scope,
    payload,
    payloadHash: fingerprint("month-run-materialized-outcome-v1", payload),
  };
}

function committedSave(
  overrides: Readonly<Record<string, unknown>> = {},
  result: unknown = createJanuary1990ResultFixture(),
): SaveRecordV1 {
  const runId = parseMonthRunId("january-programmer-bridge-run");
  const snapshot = {
    schemaVersion: "january-1990-save-snapshot-v1",
    completedMonth: {
      schemaVersion: "january-1990-completed-month-v1",
      month: "1990-01",
      runId,
      baseSaveRevision: parseSaveRevision(0),
      completedCheckpointHash: fingerprint("january-programmer-bridge-checkpoint", { revision: 9 }),
      terminalResult: result,
      outcomes: [
        storedOutcome("january-1990/access", "month/content"),
        storedOutcome("january-1990/work", "month/content"),
        storedOutcome("january-1990/defect", "month/narrative"),
        storedOutcome("january-1990/programming-outcome", "month/outcome"),
      ],
    },
  };
  return {
    schemaVersion: "save-record-v1",
    saveId: parseSaveId("january-programmer-bridge-save"),
    revision: parseSaveRevision(1),
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    snapshot: createCanonicalPayload(snapshot),
    lastCommittedRunId: runId,
    createdSequence: 1,
    updatedSequence: 2,
    ...overrides,
  } as SaveRecordV1;
}

function assessment(sourceFingerprint: string): JanuaryProfessionalLabAssessmentV1 {
  return {
    schemaVersion: "january-professional-lab-assessment-v1",
    sourceFingerprint,
    challenge: "familiar",
    feedback: "useful",
    outcome: "completed",
  };
}

describe("PROG-01B2A committed January source bridge", () => {
  it("derives deterministic practice provenance from a committed January save", () => {
    const save = committedSave();
    const source = projectCommittedJanuaryProfessionalSourceV1(save);
    const reopened = projectCommittedJanuaryProfessionalSourceV1(
      JSON.parse(JSON.stringify(save)) as SaveRecordV1,
    );

    expect(source).toEqual(reopened);
    expect(source.schemaVersion).toBe("january-professional-source-v1");
    expect(source.skillIds).toEqual(["debugging", "programming"]);
    expect(source.technologyId).toBe("gw-basic");
    expect(source.monthIndex).toBe(0);
    expect(source.episodeId).toMatch(/^jan90:[0-9a-f]{64}$/u);
    expect(source.participation).toBe("independent");
    expect(source.classificationStatus).toBe("requires-provider-assessment");
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.skillIds)).toBe(true);
    expect("grade" in source).toBe(false);
    expect("mastery" in source).toBe(false);
  });

  it("rejects uncommitted, mismatched and tampered saves", () => {
    const save = committedSave();
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1({
        ...save,
        revision: parseSaveRevision(0),
        lastCommittedRunId: null,
        snapshot: createCanonicalPayload(createJanuary1990InitialSaveSnapshot()),
      }),
    ).toThrow(/committed/u);
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1({
        ...save,
        saveSchemaFingerprint: fingerprint("different-save", { revision: 2 }),
      }),
    ).toThrow(/save schema/u);
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1({
        ...save,
        snapshot: {
          ...save.snapshot,
          json: save.snapshot.json + " ",
        },
      }),
    ).toThrow(/hash/u);
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1({
        ...save,
        lastCommittedRunId: parseMonthRunId("another-run"),
      }),
    ).toThrow(/committed run/u);
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1({
        ...save,
        revision: parseSaveRevision(2),
      }),
    ).toThrow(/save revision/u);
  });

  it("refuses incomplete evidence and incompatible January results", () => {
    const result = createJanuary1990ResultFixture();
    const incomplete = {
      ...result,
      programmingOutcome: {
        ...result.programmingOutcome,
        evidence: result.programmingOutcome.evidence.slice(0, 2),
      },
    };

    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1(committedSave({}, incomplete)),
    ).toThrow(/canonical skill evidence/u);
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1(
        committedSave({}, { ...result, schemaVersion: "future-version" }),
      ),
    ).toThrow(/schema or month/u);
    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1(
        committedSave({}, {
          ...result,
          programmingOutcome: {
            ...result.programmingOutcome,
            evidence: [
              {
                ...result.programmingOutcome.evidence[0],
                reasonCode: "january-1990.access.home-pc",
              },
              ...result.programmingOutcome.evidence.slice(1),
            ],
          },
        }),
      ),
    ).toThrow(/canonical skill evidence/u);
  });

  it("requires explicit project classification before creating a lab episode", () => {
    const source = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    const input = createJanuaryProfessionalLabEpisodeV1(
      source,
      assessment(source.sourceFingerprint),
    );
    const applied = applyProfessionalExperienceLabV1(
      createProfessionalLabStateV1(500, 500),
      input,
    );

    expect(input.provider).toBe("project");
    expect(input.contextFingerprint).toBe(source.contextFingerprint);
    expect(input.skillIds).toEqual(["debugging", "programming"]);
    expect(applied.kind).toBe("applied");
    expect(applied.state.skills).toHaveLength(2);
    expect(applied.gradeAwarded).toBe(false);
    expect(applied.independentDeliveryObserved).toBe(false);
    expect(
      applyProfessionalExperienceLabV1(applied.state, input).kind,
    ).toBe("replayed");
  });

  it("refuses guessed grades, mismatched assessment provenance and hidden extras", () => {
    const source = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    const approved = assessment(source.sourceFingerprint);

    expect(() =>
      createJanuaryProfessionalLabEpisodeV1(source, {
        ...approved,
        challenge: "independent",
      } as unknown as JanuaryProfessionalLabAssessmentV1),
    ).toThrow(/independent or complex/u);
    expect(() =>
      createJanuaryProfessionalLabEpisodeV1(source, {
        ...approved,
        sourceFingerprint: fingerprint("other", "source"),
      }),
    ).toThrow(/does not match/u);
    expect(() =>
      createJanuaryProfessionalLabEpisodeV1(source, {
        ...approved,
        awardedGrade: "Junior",
      } as unknown as JanuaryProfessionalLabAssessmentV1),
    ).toThrow(/unknown or missing/u);
  });

  it("does not mistake accessing a shared school PC or requesting help for autonomy", () => {
    const result = createJanuary1990ResultFixture();
    const assistedResult = {
      ...result,
      programmingOutcome: {
        ...result.programmingOutcome,
        defectResponse: "ask-for-guidance",
        learningPractice: "read-and-run",
        accessRoute: "shared-school-pc",
        evidence: result.programmingOutcome.evidence.map((entry) =>
          entry.skillId === JANUARY_1990_CONTENT_IDS.toolUseSkill
            ? { ...entry, reasonCode: "january-1990.access.shared-school-pc" }
            : entry,
        ),
      },
    };

    const assisted = projectCommittedJanuaryProfessionalSourceV1(committedSave({}, assistedResult));
    expect(assisted.participation).toBe("assisted");
    expect(assisted.skillIds).toEqual(["debugging", "programming"]);
    expect(assisted.classificationStatus).toBe("requires-provider-assessment");
  });
});
