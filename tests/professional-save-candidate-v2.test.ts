import { describe, expect, it } from "vitest";

import {
  createFreshProfessionalSaveCandidateV2,
  inspectCommittedJanuaryProfessionalImportV2,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  parseProfessionalSaveCandidateV2,
  prepareCommittedJanuaryProfessionalCandidateV2,
  PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
  PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import { parseSaveId } from "@runtime-human/game-schema";

import {
  createHarnessedJanuaryRuntime,
  reachJanuaryDefectBoundary,
  requireJanuaryCommitted,
  resumeJanuary,
} from "./helpers/january-1990-runtime-fixture";

async function committedJanuary() {
  const source = await createHarnessedJanuaryRuntime();
  const defect = await reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);
  const committed = requireJanuaryCommitted(
    await resumeJanuary(source.runtime, defect, {
      requestId: "commit-january-professional-preview",
      answer: {
        schemaVersion: "january-defect-answer-v1",
        response: "inspect-listing",
      },
    }),
  );
  return { source, committed };
}

describe("PROG-01B2B versioned professional save candidate", () => {
  it("creates a fresh, bounded, uncredited v2 candidate with a separate fingerprint", () => {
    const value = createFreshProfessionalSaveCandidateV2(480, 520);
    const restored = parseProfessionalSaveCandidateV2(JSON.parse(JSON.stringify(value)));

    expect(restored).toEqual(value);
    expect(restored.january.completedMonth).toBeNull();
    expect(restored.legacyImport).toBeNull();
    expect(restored.professional.aptitudes).toEqual({ reasoning: 480, learning: 520 });
    expect(restored.professional.skills).toHaveLength(0);
    expect(restored.professional.lastEpisode).toBeNull();
    expect(Object.isFrozen(restored)).toBe(true);
    expect(Object.isFrozen(restored.professional)).toBe(true);
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/u);
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/u);
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT).not.toBe(
      PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
    );
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT).not.toBe(
      JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    );
  });

  it("blocks initial saves rather than inventing historical professional progress", async () => {
    const { harness, saveId } = await createHarnessedJanuaryRuntime();
    const result = await inspectCommittedJanuaryProfessionalImportV2(harness.service, saveId, {
      reasoning: 500,
      learning: 500,
    });

    expect(result).toEqual({ kind: "blocked", reason: "incompatible-source" });
    expect(harness.getSave().revision).toBe(0);
    expect(harness.getStats().commitMutations).toBe(0);
  });

  it("blocks migration preview while January is suspended at a decision", async () => {
    const source = await createHarnessedJanuaryRuntime();
    await reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);

    const result = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 500, learning: 500 },
    );

    expect(result).toEqual({ kind: "blocked", reason: "active-month-run" });
    expect(source.harness.getSave().revision).toBe(0);
    expect(source.harness.getStats().commitMutations).toBe(0);
  });

  it("previews committed history with zero retroactive mastery and stable provenance", async () => {
    const { source, committed } = await committedJanuary();
    const statsBefore = source.harness.getStats();
    const first = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 430, learning: 610 },
    );
    const again = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 430, learning: 610 },
    );

    expect(first).toEqual(again);
    expect(first.kind).toBe("eligible-preview");
    if (first.kind !== "eligible-preview") throw new Error("Expected a committed candidate");
    expect(first.migrationIsAtomic).toBe(false);
    expect(first.observedRevision).toBe(1);
    expect(first.candidate.legacyImport?.assessmentStatus).toBe("unassessed");
    expect(first.candidate.legacyImport?.originalRunId).toBe(source.runId);
    expect(first.candidate.professional.skills).toEqual([]);
    expect(first.candidate.professional.technology).toBeNull();
    expect(first.candidate.professional.lastEpisode).toBeNull();
    expect(first.candidate.january.completedMonth?.runId).toBe(source.runId);
    expect(first.candidate.january.completedMonth?.terminalResult).toEqual(
      committed.checkpoint.terminalResult,
    );
    expect(parseProfessionalSaveCandidateV2(JSON.parse(JSON.stringify(first.candidate)))).toEqual(
      first.candidate,
    );
    expect(source.harness.getStats()).toEqual(statsBefore);
    expect(source.harness.getSave().saveSchemaFingerprint).toBe(
      JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    );
  });

  it("rejects forged imports, extra grades and credited historical lab episodes", async () => {
    const { source } = await committedJanuary();
    const valid = prepareCommittedJanuaryProfessionalCandidateV2(
      source.harness.getSave(),
      500,
      500,
    );
    const receipt = valid.legacyImport;
    if (receipt === null) throw new Error("Expected legacy receipt");

    expect(() => parseProfessionalSaveCandidateV2({ ...valid, grade: "Junior" })).toThrow(
      /unknown or missing fields/u,
    );
    expect(() =>
      parseProfessionalSaveCandidateV2({
        ...valid,
        legacyImport: { ...receipt, assessmentStatus: "assessed" },
      }),
    ).toThrow(/assessed experience/u);
    expect(() =>
      parseProfessionalSaveCandidateV2({
        ...valid,
        legacyImport: {
          ...receipt,
          originalSnapshotSha256: fingerprint("tampered-snapshot", { value: 1 }),
        },
      }),
    ).toThrow(/snapshot SHA-256/u);
    expect(() =>
      parseProfessionalSaveCandidateV2({
        ...valid,
        legacyImport: {
          ...receipt,
          sourceFingerprint: fingerprint("tampered-source", { value: 2 }),
        },
      }),
    ).toThrow(/source fingerprint/u);
    expect(() =>
      parseProfessionalSaveCandidateV2({
        ...valid,
        professional: {
          ...valid.professional,
          awardedGrade: "Junior",
        },
      }),
    ).toThrow(/fields do not match/u);
  });

  it("blocks a source change across the two preflight reads without writing", async () => {
    const { source } = await committedJanuary();
    let reads = 0;
    const race = {
      ...source.harness.service,
      async loadSave(query: Parameters<typeof source.harness.service.loadSave>[0]) {
        const result = await source.harness.service.loadSave(query);
        reads += 1;
        if (reads === 2 && result.kind === "found") {
          return {
            kind: "found" as const,
            value: {
              ...result.value,
              updatedSequence: result.value.updatedSequence + 1,
            },
          };
        }
        return result;
      },
    };

    const result = await inspectCommittedJanuaryProfessionalImportV2(race, source.saveId, {
      reasoning: 500,
      learning: 500,
    });
    expect(result).toEqual({ kind: "blocked", reason: "source-changed" });
    expect(source.harness.getStats().commitMutations).toBe(1);
  });

  it("blocks recovery restrictions and does not authorize atomic migration", async () => {
    const { source } = await committedJanuary();
    source.harness.setRecoveryStatus({
      schemaVersion: "recovery-status-v1",
      status: "newer-schema-read-only",
      writable: false,
      backupAvailable: true,
    });

    const result = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 500, learning: 500 },
    );
    expect(result).toEqual({ kind: "blocked", reason: "recovery-unavailable" });
  });

  it("rejects unknown source save IDs without creating another save", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const result = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      parseSaveId("not-the-saved-character"),
      { reasoning: 500, learning: 500 },
    );
    expect(result).toEqual({ kind: "blocked", reason: "save-not-found" });
    expect(source.harness.getStats().commitMutations).toBe(0);
  });
});
