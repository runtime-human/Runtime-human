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
  projectProfessionalLabFluencyV1,
} from "@runtime-human/game-core";
import { parseMonthRunId, parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";
import type { SaveRecordV1 } from "@runtime-human/game-persistence-contracts";

import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";
import {
  createHarnessedJanuaryRuntime,
  requireJanuaryCommitted,
  resumeJanuary,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

function storedOutcome(id: string, scope: string, payload: unknown = { marker: id }) {
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
        storedOutcome(
          "january-1990/programming-outcome",
          "month/outcome",
          (result as { programmingOutcome?: unknown }).programmingOutcome ?? {},
        ),
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

function resultWith(overrides: Readonly<Record<string, unknown>>) {
  const result = createJanuary1990ResultFixture();
  const accessRoute =
    (overrides.accessRoute as "home-pc" | "shared-school-pc" | undefined) ??
    result.programmingOutcome.accessRoute;
  return {
    ...result,
    programmingOutcome: {
      ...result.programmingOutcome,
      ...overrides,
      accessRoute,
      evidence: result.programmingOutcome.evidence.map((entry) =>
        entry.skillId === JANUARY_1990_CONTENT_IDS.toolUseSkill
          ? Object.assign({}, entry, { reasonCode: `january-1990.access.${accessRoute}` })
          : entry,
      ),
    },
  };
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
        committedSave(
          {},
          {
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
          },
        ),
      ),
    ).toThrow(/canonical skill evidence/u);
  });

  it("requires explicit project classification before creating a lab episode", () => {
    const source = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    const input = createJanuaryProfessionalLabEpisodeV1(
      source,
      assessment(source.sourceFingerprint),
    );
    const applied = applyProfessionalExperienceLabV1(createProfessionalLabStateV1(500, 500), input);

    expect(input.provider).toBe("project");
    expect(input.contextFingerprint).toBe(source.contextFingerprint);
    expect(input.skillIds).toEqual(["debugging", "programming"]);
    expect(applied.kind).toBe("applied");
    expect(applied.state.skills).toHaveLength(2);
    expect(applied.gradeAwarded).toBe(false);
    expect(applied.independentDeliveryObserved).toBe(false);
    expect(applyProfessionalExperienceLabV1(applied.state, input).kind).toBe("replayed");
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
  it("measures each participation trigger alone and keeps other paths independent", () => {
    const participation = (overrides: Readonly<Record<string, unknown>>) =>
      projectCommittedJanuaryProfessionalSourceV1(committedSave({}, resultWith(overrides)))
        .participation;
    const baseline = createJanuary1990ResultFixture().programmingOutcome;

    expect(participation({})).toBe("independent");
    expect(participation({ defectResponse: "ask-for-guidance" })).toBe("assisted");
    expect(participation({ learningPractice: "read-and-run" })).toBe("assisted");
    expect(participation({ defectResponse: "change-input" })).toBe("independent");
    expect(participation({ defectResponse: "inspect-listing" })).toBe("independent");
    expect(participation({ accessRoute: "shared-school-pc" })).toBe("independent");
    expect(["ask-for-guidance", "read-and-run"]).not.toContain(baseline.defectResponse);
  });

  it("keeps task context independent of player choices while the source still differs", () => {
    const base = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    for (const overrides of [
      { accessRoute: "shared-school-pc" },
      { learningPractice: "read-and-run" },
      { defectResponse: "change-input" },
    ]) {
      const changed = projectCommittedJanuaryProfessionalSourceV1(
        committedSave({}, resultWith(overrides)),
      );
      expect(changed.contextFingerprint).toBe(base.contextFingerprint);
      expect(changed.sourceFingerprint).not.toBe(base.sourceFingerprint);
      expect(changed.episodeId).not.toBe(base.episodeId);
    }
  });

  it("rejects forged, copied or mutated sources before any episode is created", () => {
    const source = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    const approved = assessment(source.sourceFingerprint);
    const create = (forged: unknown, value = approved) =>
      createJanuaryProfessionalLabEpisodeV1(
        forged as typeof source,
        value as JanuaryProfessionalLabAssessmentV1,
      );

    expect(() => create({ ...source, participation: "independent" })).toThrow(/not minted/u);
    expect(() =>
      create({ ...source, participation: "independent" }, assessment(source.sourceFingerprint)),
    ).toThrow(/not minted/u);
    expect(() =>
      create({ ...source, skillIds: ["debugging", "programming", "architecture"] }),
    ).toThrow(/not minted/u);
    expect(() =>
      create({
        ...source,
        episodeId: `jan90:${fingerprint("forged", "episode")}`,
        contextFingerprint: fingerprint("forged", "context"),
      }),
    ).toThrow(/not minted/u);
    expect(() => create(JSON.parse(JSON.stringify(source)))).toThrow(/not minted/u);
    expect(() => create(Object.create(source))).toThrow(/not minted/u);
    expect(() => create(Object.freeze({ ...source }))).toThrow(/not minted/u);
    expect(() => create(null)).toThrow(/not minted/u);
    expect(() => create(undefined)).toThrow(/not minted/u);

    // A genuine source is frozen and cannot be altered in place either.
    expect(() => {
      (source as { participation: string }).participation = "independent";
    }).toThrow(TypeError);
    expect(() => {
      (source.skillIds as unknown as string[]).push("architecture");
    }).toThrow(TypeError);
    expect(create(source).participation).toBe("independent");
  });

  it("rejects an assessment issued for a different committed save", () => {
    const first = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    const other = projectCommittedJanuaryProfessionalSourceV1(
      committedSave({ saveId: parseSaveId("january-programmer-other-save") }),
    );

    expect(other.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(() =>
      createJanuaryProfessionalLabEpisodeV1(first, assessment(other.sourceFingerprint)),
    ).toThrow(/does not match/u);
  });

  it("detaches the assessment so a mutating getter cannot split the checks", () => {
    const source = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    let reads = 0;
    const trap = {
      schemaVersion: "january-professional-lab-assessment-v1",
      sourceFingerprint: source.sourceFingerprint,
      feedback: "useful",
      outcome: "completed",
      get challenge() {
        reads += 1;
        return reads === 1 ? "familiar" : "independent";
      },
    };

    // Accessors are refused outright; they are never evaluated more than once.
    expect(() =>
      createJanuaryProfessionalLabEpisodeV1(
        source,
        trap as unknown as JanuaryProfessionalLabAssessmentV1,
      ),
    ).toThrow(/plain record/u);
    expect(reads).toBeLessThanOrEqual(1);
    expect(() =>
      createJanuaryProfessionalLabEpisodeV1(
        source,
        Object.assign(Object.create({ inherited: true }), assessment(source.sourceFingerprint)),
      ),
    ).toThrow(/plain record|unknown or missing/u);
  });

  it("rejects a stored programming outcome that disagrees with the terminal result", () => {
    const result = createJanuary1990ResultFixture();
    const save = committedSave({}, result);
    const snapshot = JSON.parse(save.snapshot.json) as {
      completedMonth: { outcomes: { payload: unknown; payloadHash: string }[] };
    };
    const forgedPayload = {
      ...result.programmingOutcome,
      defectResponse: "change-input",
    };
    const outcome = snapshot.completedMonth.outcomes[3];
    if (outcome === undefined) throw new Error("fixture outcome missing");
    outcome.payload = forgedPayload;
    outcome.payloadHash = fingerprint("month-run-materialized-outcome-v1", forgedPayload);

    expect(() =>
      projectCommittedJanuaryProfessionalSourceV1({
        ...save,
        snapshot: createCanonicalPayload(snapshot),
      }),
    ).toThrow(/stored outcome/u);
  });

  it("keeps assisted help below independent practice for the same classified task", () => {
    const independentSource = projectCommittedJanuaryProfessionalSourceV1(committedSave());
    const assistedSource = projectCommittedJanuaryProfessionalSourceV1(
      committedSave({}, resultWith({ defectResponse: "ask-for-guidance" })),
    );
    const run = (source: typeof independentSource) => {
      const episode = createJanuaryProfessionalLabEpisodeV1(
        source,
        assessment(source.sourceFingerprint),
      );
      const applied = applyProfessionalExperienceLabV1(
        createProfessionalLabStateV1(500, 500),
        episode,
      );
      return applied.state.skills.map((skill) => projectProfessionalLabFluencyV1(skill, 0));
    };

    const assisted = run(assistedSource);
    const independent = run(independentSource);
    expect(assisted).toHaveLength(2);
    assisted.forEach((fluency, index) => {
      expect(fluency).toBeLessThanOrEqual(independent[index] ?? Number.POSITIVE_INFINITY);
    });
  });

  it("bridges a real committed January save produced by the production flow", async () => {
    const { harness, runtime, saveId, runId } = await createHarnessedJanuaryRuntime();
    const access = await startJanuary(runtime, saveId, runId);
    const learning = await resumeJanuary(runtime, access, {
      requestId: "resume-bridge-access",
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    });
    if (learning.kind !== "waiting-decision") throw new Error("expected learning boundary");
    const defect = await resumeJanuary(runtime, learning, {
      requestId: "resume-bridge-learning",
      answer: { schemaVersion: "january-learning-answer-v1", practice: "edit-and-debug" },
    });
    if (defect.kind !== "waiting-decision") throw new Error("expected defect boundary");
    requireJanuaryCommitted(
      await resumeJanuary(runtime, defect, {
        requestId: "resume-bridge-defect",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );

    const save = harness.getSave();
    const source = projectCommittedJanuaryProfessionalSourceV1(save);
    expect(projectCommittedJanuaryProfessionalSourceV1(save)).toEqual(source);
    expect(source.participation).toBe("independent");
    expect(source.sourceRunId).toBe(runId);
    const input = createJanuaryProfessionalLabEpisodeV1(
      source,
      assessment(source.sourceFingerprint),
    );
    expect(
      applyProfessionalExperienceLabV1(createProfessionalLabStateV1(500, 500), input).kind,
    ).toBe("applied");
  });
});
