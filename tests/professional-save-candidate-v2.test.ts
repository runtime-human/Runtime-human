import { describe, expect, it } from "vitest";

import {
  createFreshProfessionalSaveCandidateV2,
  inspectCommittedJanuaryProfessionalImportV2,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  ProfessionalImportRefusedError,
  parseProfessionalSaveCandidateV2,
  prepareCommittedJanuaryProfessionalCandidateV2,
  PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
  PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  canonicalizeAuthoritative,
  createProfessionalLabStateV1,
  fingerprint,
  PROFESSIONAL_LAB_ALGORITHM_VERSION_V1,
  PROFESSIONAL_LAB_RULES_V1,
  PROFESSIONAL_LAB_STATE_MANIFEST_V1,
  parseProfessionalLabStateV1,
  sha256Hex,
} from "@runtime-human/game-core";
import {
  parseSha256Hex,
  type RecoveryStatus,
  type SaveRecordV1,
} from "@runtime-human/game-persistence-contracts";
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

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toReversed()
        .map(([key, entry]) => [key, reverseKeys(entry)]),
    );
  }
  return value;
}

/** A hash-consistent, schema-valid January v1 payload that is NOT canonically serialized. */
function nonCanonicalSave(save: SaveRecordV1): SaveRecordV1 {
  const json = JSON.stringify(reverseKeys(JSON.parse(save.snapshot.json)), null, 2);
  expect(json).not.toBe(save.snapshot.json);
  return { ...save, snapshot: { ...save.snapshot, json, sha256: parseSha256Hex(sha256Hex(json)) } };
}

function withReads(
  service: Parameters<typeof inspectCommittedJanuaryProfessionalImportV2>[0],
  override: Partial<Record<"loadSave" | "loadActiveMonthRun" | "getRecoveryStatus", unknown>>,
) {
  return { ...service, ...override } as Parameters<
    typeof inspectCommittedJanuaryProfessionalImportV2
  >[0];
}

const REJECTED = {
  kind: "rejected" as const,
  error: {
    schemaVersion: "persistence-error-v1" as const,
    code: "PersistenceUnavailable",
    message: "unavailable",
  },
};

function probeSchemaFingerprint(january: string, manifest: unknown): string {
  return fingerprint("professional-save-candidate-schema-v2", { january, manifest });
}

const APTITUDES = { reasoning: 500, learning: 500 };

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

    expect(result).toEqual({ kind: "blocked", reason: "nothing-to-import" });
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

  it("pins golden schema and rules fingerprints so a silent contract edit fails", () => {
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT).toBe(
      "438d397a16781f85f67e787ee52e9fc611409df84e770082c080cfb4975e2420",
    );
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT).toBe(
      "5022c244513b5e6be49f488444e805134cdbee8b89521aec92ec5de5c8643c80",
    );
  });

  it("derives the fingerprints from the real January schema, lab manifest and algorithm token", () => {
    expect(PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT).toBe(
      fingerprint("professional-lab-rules-v1", {
        algorithm: PROFESSIONAL_LAB_ALGORITHM_VERSION_V1,
        rules: PROFESSIONAL_LAB_RULES_V1,
      }),
    );
    expect(PROFESSIONAL_LAB_ALGORITHM_VERSION_V1).toBe("professional-lab-apply-v1");
    // The structural fingerprint must change when the January schema or lab manifest does.
    expect(
      probeSchemaFingerprint(
        JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
        PROFESSIONAL_LAB_STATE_MANIFEST_V1,
      ),
    ).not.toBe(
      probeSchemaFingerprint(
        sha256Hex("another january schema"),
        PROFESSIONAL_LAB_STATE_MANIFEST_V1,
      ),
    );
    expect(
      probeSchemaFingerprint(
        JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
        PROFESSIONAL_LAB_STATE_MANIFEST_V1,
      ),
    ).not.toBe(
      probeSchemaFingerprint(JANUARY_1990_SAVE_SCHEMA_FINGERPRINT, {
        ...PROFESSIONAL_LAB_STATE_MANIFEST_V1,
        skillIds: [],
      }),
    );
  });

  it("keeps the lab-state manifest in step with the real parser", () => {
    const manifest = PROFESSIONAL_LAB_STATE_MANIFEST_V1;
    const fresh = createProfessionalLabStateV1(0, manifest.aptitudeBounds.maximum);
    expect(Object.keys(fresh).toSorted()).toEqual([...manifest.stateFields]);
    expect(Object.keys(fresh.aptitudes).toSorted()).toEqual([...manifest.aptitudeFields]);

    const month = manifest.monthBounds.maximum;
    const point = manifest.skillPointBounds.maximum;
    const hash = "a".repeat(64);
    const progressed = (skillId: string) => ({
      ...fresh,
      skills: [{ skillId, mastery: point, fluency: point, lastPracticedMonth: month }],
      technology: {
        technologyId: manifest.technologyIds[0],
        familiarity: point,
        lastPracticedMonth: month,
      },
      recentContexts: [hash],
      lastEpisode: { id: "episode-1", hash, monthIndex: month },
    });
    for (const skillId of manifest.skillIds) {
      const parsed = parseProfessionalLabStateV1(progressed(skillId));
      expect(Object.keys(parsed.skills[0] ?? {}).toSorted()).toEqual([...manifest.skillFields]);
      expect(Object.keys(parsed.technology ?? {}).toSorted()).toEqual([
        ...manifest.technologyFields,
      ]);
      expect(Object.keys(parsed.lastEpisode ?? {}).toSorted()).toEqual([
        ...manifest.lastEpisodeFields,
      ]);
    }
    expect(() => parseProfessionalLabStateV1(progressed("not-a-skill"))).toThrow();
    expect(manifest.maximumRecentContexts).toBe(PROFESSIONAL_LAB_RULES_V1.maximumRecentContexts);
    expect(() =>
      parseProfessionalLabStateV1({
        ...progressed(manifest.skillIds[0] ?? ""),
        recentContexts: Array.from({ length: manifest.maximumRecentContexts + 1 }, (_, i) =>
          i.toString(16).padStart(64, "0"),
        ),
      }),
    ).toThrow();
  });

  it("refuses a valid but non-canonically serialized January save with an explicit reason", async () => {
    const { source } = await committedJanuary();
    const original = source.harness.getSave();
    const stored = nonCanonicalSave(original);
    // Valid v1 with a consistent raw hash: refused explicitly, not as an incompatible source.
    let thrown: unknown;
    try {
      prepareCommittedJanuaryProfessionalCandidateV2(stored, 500, 500);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ProfessionalImportRefusedError);
    expect((thrown as ProfessionalImportRefusedError).reason).toBe("non-canonical-source-snapshot");

    const service = withReads(source.harness.service, {
      async loadSave() {
        return { kind: "found" as const, value: stored };
      },
    });
    expect(
      await inspectCommittedJanuaryProfessionalImportV2(service, source.saveId, APTITUDES),
    ).toEqual({ kind: "blocked", reason: "non-canonical-source-snapshot" });
    // The canonical original still previews, with the receipt hash equal to the stored hash.
    const ok = prepareCommittedJanuaryProfessionalCandidateV2(original, 500, 500);
    expect(ok.legacyImport?.originalSnapshotSha256).toBe(original.snapshot.sha256);
    expect(sha256Hex(canonicalizeAuthoritative(ok.january))).toBe(original.snapshot.sha256);
  });

  it("reports an idle save as nothing-to-import, distinct from a damaged one", async () => {
    const { harness, saveId } = await createHarnessedJanuaryRuntime();
    expect(() =>
      prepareCommittedJanuaryProfessionalCandidateV2(harness.getSave(), 500, 500),
    ).toThrow(ProfessionalImportRefusedError);

    const damaged = withReads(harness.service, {
      async loadSave() {
        const value = harness.getSave();
        return {
          kind: "found" as const,
          value: {
            ...value,
            snapshot: { ...value.snapshot, sha256: parseSha256Hex(sha256Hex("different payload")) },
          },
        };
      },
    });
    const result = await inspectCommittedJanuaryProfessionalImportV2(damaged, saveId, APTITUDES);
    expect(result.kind).toBe("blocked");
    expect(result).not.toEqual({ kind: "blocked", reason: "nothing-to-import" });
  });

  it("rejects invalid aptitudes before any persistence IO", async () => {
    const { source } = await committedJanuary();
    let calls = 0;
    const counting = new Proxy(source.harness.service, {
      get(target, property, receiver) {
        const value: unknown = Reflect.get(target, property, receiver);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          calls += 1;
          return (value as (...input: unknown[]) => unknown).apply(target, args);
        };
      },
    });
    const invalid = [
      { reasoning: -1, learning: 500 },
      { reasoning: 500, learning: 1_001 },
      { reasoning: 1.5, learning: 500 },
      { reasoning: Number.NaN, learning: 500 },
      { reasoning: 500, learning: Number.POSITIVE_INFINITY },
    ];
    await Promise.all(
      invalid.map((bad) =>
        expect(
          inspectCommittedJanuaryProfessionalImportV2(counting, source.saveId, bad),
        ).rejects.toThrow(/aptitude/u),
      ),
    );
    for (const bad of invalid) {
      expect(() =>
        prepareCommittedJanuaryProfessionalCandidateV2(
          source.harness.getSave(),
          bad.reasoning,
          bad.learning,
        ),
      ).toThrow(/aptitude/u);
      expect(() => createFreshProfessionalSaveCandidateV2(bad.reasoning, bad.learning)).toThrow(
        /aptitude/u,
      );
    }
    expect(calls).toBe(0);
    // Boundaries are inclusive.
    expect(
      prepareCommittedJanuaryProfessionalCandidateV2(source.harness.getSave(), 0, 1_000)
        .professional.aptitudes,
    ).toEqual({ reasoning: 0, learning: 1_000 });
  });

  it("prepares idempotently without mutating the source save", async () => {
    const { source } = await committedJanuary();
    const save = source.harness.getSave();
    const before = structuredClone(save);
    const first = prepareCommittedJanuaryProfessionalCandidateV2(save, 500, 500);
    const second = prepareCommittedJanuaryProfessionalCandidateV2(save, 500, 500);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(save).toEqual(before);
    expect(source.harness.getSave()).toEqual(before);
    expect(first.january).not.toBe(second.january);
  });

  it("reports persistence-unavailable for each rejected read and recovery failure", async () => {
    const { source } = await committedJanuary();
    const base = source.harness.service;
    const run = (override: Parameters<typeof withReads>[1]) =>
      inspectCommittedJanuaryProfessionalImportV2(
        withReads(base, override),
        source.saveId,
        APTITUDES,
      );

    expect(await run({ getRecoveryStatus: async () => REJECTED })).toEqual({
      kind: "blocked",
      reason: "recovery-unavailable",
    });
    expect(await run({ loadSave: async () => REJECTED })).toEqual({
      kind: "blocked",
      reason: "persistence-unavailable",
    });
    expect(await run({ loadActiveMonthRun: async () => REJECTED })).toEqual({
      kind: "blocked",
      reason: "persistence-unavailable",
    });
    let reads = 0;
    expect(
      await run({
        async loadSave(query: Parameters<typeof base.loadSave>[0]) {
          reads += 1;
          return reads === 2 ? REJECTED : base.loadSave(query);
        },
      }),
    ).toEqual({ kind: "blocked", reason: "persistence-unavailable" });
  });

  it("blocks when the save disappears or its payload changes between reads", async () => {
    const { source } = await committedJanuary();
    const base = source.harness.service;
    const second = (mutate: (value: SaveRecordV1) => ReturnType<typeof base.loadSave>) => {
      let reads = 0;
      return withReads(base, {
        async loadSave(query: Parameters<typeof base.loadSave>[0]) {
          const result = await base.loadSave(query);
          reads += 1;
          if (reads === 2 && result.kind === "found") return mutate(result.value);
          return result;
        },
      });
    };

    expect(
      await inspectCommittedJanuaryProfessionalImportV2(
        second(async () => ({ kind: "not-found" as const })),
        source.saveId,
        APTITUDES,
      ),
    ).toEqual({ kind: "blocked", reason: "source-changed" });

    // Same revision and sequence, different payload bytes (and matching hash).
    const json = `${source.harness.getSave().snapshot.json} `;
    expect(
      await inspectCommittedJanuaryProfessionalImportV2(
        second(async (value) => ({
          kind: "found" as const,
          value: {
            ...value,
            snapshot: { ...value.snapshot, json, sha256: parseSha256Hex(sha256Hex(json)) },
          },
        })),
        source.saveId,
        APTITUDES,
      ),
    ).toEqual({ kind: "blocked", reason: "source-changed" });
  });

  it("only previews for healthy or unclean-but-valid writable recovery", async () => {
    const { source } = await committedJanuary();
    const statuses: readonly RecoveryStatus[] = [
      "healthy",
      "unclean-but-valid",
      "newer-schema-read-only",
      "migration-history-mismatch",
      "corrupted",
      "backup-available",
    ];
    const cases = statuses.flatMap((status) =>
      [true, false].map((writable) => ({ status, writable })),
    );
    await Promise.all(
      cases.map(async ({ status, writable }) => {
        const service = withReads(source.harness.service, {
          getRecoveryStatus: async () => ({
            kind: "found" as const,
            value: {
              schemaVersion: "recovery-status-v1",
              status,
              writable,
              backupAvailable: true,
            },
          }),
        });
        const result = await inspectCommittedJanuaryProfessionalImportV2(
          service,
          source.saveId,
          APTITUDES,
        );
        const allowed = writable && (status === "healthy" || status === "unclean-but-valid");
        expect(result.kind, `${status} writable=${String(writable)}`).toBe(
          allowed ? "eligible-preview" : "blocked",
        );
        if (!allowed) expect(result).toEqual({ kind: "blocked", reason: "recovery-unavailable" });
      }),
    );
  });

  it("rejects a candidate whose terminal result lacks canonical skill evidence", async () => {
    const { source } = await committedJanuary();
    const valid = prepareCommittedJanuaryProfessionalCandidateV2(
      source.harness.getSave(),
      500,
      500,
    );
    const receipt = valid.legacyImport;
    const month = valid.january.completedMonth;
    if (receipt === null || month === null) throw new Error("Expected committed candidate");

    // Swap the evidence reason codes: still shape-valid, hash-consistent, receipt-consistent.
    const result = structuredClone(month.terminalResult) as {
      programmingOutcome: { evidence: { skillId: string; reasonCode: string }[] };
    };
    const evidence = result.programmingOutcome.evidence;
    const [first, second] = [evidence[0], evidence[1]];
    if (first === undefined || second === undefined) throw new Error("Expected evidence");
    [first.reasonCode, second.reasonCode] = [second.reasonCode, first.reasonCode];
    const payload = result.programmingOutcome;
    const outcomes = month.outcomes.map((entry) =>
      entry.outcomeId === "january-1990/programming-outcome"
        ? {
            ...entry,
            payload,
            payloadHash: fingerprint("month-run-materialized-outcome-v1", payload),
          }
        : entry,
    );
    const january = {
      ...valid.january,
      completedMonth: { ...month, terminalResult: result, outcomes },
    };
    const forged = {
      ...valid,
      january,
      legacyImport: {
        ...receipt,
        originalSnapshotSha256: sha256Hex(canonicalizeAuthoritative(january)),
        sourceFingerprint: fingerprint("january-professional-committed-source-v1", {
          saveId: receipt.originalSaveId,
          runId: month.runId,
          checkpointHash: month.completedCheckpointHash,
          result,
        }),
      },
    };
    expect(() => parseProfessionalSaveCandidateV2(forged)).toThrow(/canonical skill evidence/u);
  });
});
