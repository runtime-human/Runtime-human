import {
  fingerprint,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  parseJanuary1990Result,
  parseProfessionalLabEpisodeV1,
  sha256Hex,
  type ProfessionalLabEpisodeV1,
} from "@runtime-human/game-core";
import { parseSaveRecord, type SaveRecordV1 } from "@runtime-human/game-persistence-contracts";

import {
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  parseJanuary1990SaveSnapshot,
} from "./january-save-snapshot";

/**
 * B2A only: verifies the provenance of a COMMITTED January save.
 * It cannot award mastery or a professional grade by itself.
 * Challenge, feedback and delivery outcome are absent from January v1
 * and must not be silently invented from the quality scores.
 */
export type JanuaryProfessionalSourceV1 = Readonly<{
  schemaVersion: "january-professional-source-v1";
  sourceFingerprint: string;
  sourceRunId: string;
  sourceCheckpointHash: string;
  episodeId: string;
  monthIndex: 0;
  contextFingerprint: string;
  participation: "assisted" | "independent";
  skillIds: readonly ["debugging", "programming"];
  technologyId: "gw-basic";
  classificationStatus: "requires-provider-assessment";
}>;

export type JanuaryProfessionalLabAssessmentV1 = Readonly<{
  schemaVersion: "january-professional-lab-assessment-v1";
  sourceFingerprint: string;
  challenge: "guided" | "familiar";
  feedback: "limited" | "useful" | "thorough";
  outcome: "completed" | "partial" | "failed-with-learning" | "recovered";
}>;

export function projectCommittedJanuaryProfessionalSourceV1(
  storedSave: SaveRecordV1,
): JanuaryProfessionalSourceV1 {
  const save = parseSaveRecord(storedSave);
  if (save.saveSchemaFingerprint !== JANUARY_1990_SAVE_SCHEMA_FINGERPRINT) {
    throw new TypeError("Professional source requires the approved January v1 save schema");
  }
  if (sha256Hex(save.snapshot.json) !== save.snapshot.sha256) {
    throw new TypeError("Professional source save payload hash does not match JSON");
  }

  let serializedSnapshot: unknown;
  try {
    serializedSnapshot = JSON.parse(save.snapshot.json) as unknown;
  } catch {
    throw new TypeError("Professional source save payload contains invalid JSON");
  }
  const snapshot = parseJanuary1990SaveSnapshot(serializedSnapshot);
  const month = snapshot.completedMonth;
  if (month === null || save.lastCommittedRunId === null) {
    throw new TypeError("Professional source requires a completed, committed January month");
  }
  if (save.lastCommittedRunId !== month.runId || month.baseSaveRevision + 1 !== save.revision) {
    throw new TypeError("Professional source committed run or save revision does not match");
  }

  const outcome = parseJanuary1990Result(month.terminalResult).programmingOutcome;
  requireJanuaryEvidence(outcome.evidence, outcome.accessRoute);

  const contextFingerprint = fingerprint("january-professional-task-context-v1", {
    projectId: outcome.projectId,
    workPackageId: outcome.workPackageId,
    defectEventId: outcome.defectEventId,
  });
  const sourceFingerprint = fingerprint("january-professional-committed-source-v1", {
    saveId: save.saveId,
    runId: month.runId,
    checkpointHash: month.completedCheckpointHash,
    result: month.terminalResult,
  });
  const participation =
    outcome.defectResponse === "ask-for-guidance" || outcome.learningPractice === "read-and-run"
      ? "assisted"
      : "independent";

  return Object.freeze({
    schemaVersion: "january-professional-source-v1",
    sourceFingerprint,
    sourceRunId: month.runId,
    sourceCheckpointHash: month.completedCheckpointHash,
    episodeId: `jan90:${sourceFingerprint}`,
    monthIndex: 0,
    contextFingerprint,
    participation,
    skillIds: Object.freeze(["debugging", "programming"] as const),
    technologyId: "gw-basic",
    classificationStatus: "requires-provider-assessment",
  });
}

/**
 * Produces a LAB-only input, never a committed progression delta.
 * An explicit provider assessment is mandatory: January v1 did not record
 * verified challenge or feedback bands, nor a graded delivery outcome.
 * This first task cannot be classified as independent/complex challenge.
 */
export function createJanuaryProfessionalLabEpisodeV1(
  source: JanuaryProfessionalSourceV1,
  assessment: JanuaryProfessionalLabAssessmentV1,
): ProfessionalLabEpisodeV1 {
  if (
    source.schemaVersion !== "january-professional-source-v1" ||
    source.classificationStatus !== "requires-provider-assessment" ||
    source.monthIndex !== 0
  ) {
    throw new TypeError("Professional source is incompatible");
  }
  const approved = exactRecord(assessment, [
    "challenge",
    "feedback",
    "outcome",
    "schemaVersion",
    "sourceFingerprint",
  ]);
  if (
    approved.schemaVersion !== "january-professional-lab-assessment-v1" ||
    approved.sourceFingerprint !== source.sourceFingerprint
  ) {
    throw new TypeError("Professional assessment does not match the committed source");
  }
  if (approved.challenge !== "guided" && approved.challenge !== "familiar") {
    throw new TypeError("January cannot claim independent or complex challenge");
  }
  if (
    approved.feedback !== "limited" &&
    approved.feedback !== "useful" &&
    approved.feedback !== "thorough"
  ) {
    throw new TypeError("Professional feedback assessment is invalid");
  }
  if (
    approved.outcome !== "completed" &&
    approved.outcome !== "partial" &&
    approved.outcome !== "failed-with-learning" &&
    approved.outcome !== "recovered"
  ) {
    throw new TypeError("Professional delivery assessment is invalid");
  }

  return parseProfessionalLabEpisodeV1({
    schemaVersion: "professional-lab-episode-v1",
    id: source.episodeId,
    monthIndex: 0,
    provider: "project",
    skillIds: source.skillIds,
    technologyId: source.technologyId,
    contextFingerprint: source.contextFingerprint,
    participation: source.participation,
    challenge: approved.challenge,
    feedback: approved.feedback,
    outcome: approved.outcome,
  });
}

function requireJanuaryEvidence(
  evidence: readonly Readonly<{ skillId: string; reasonCode: string }>[],
  accessRoute: "home-pc" | "shared-school-pc",
): void {
  const expected = new Map([
    [JANUARY_1990_CONTENT_IDS.programWritingSkill, JANUARY_1990_REASON_CODES.inputOutputProject],
    [JANUARY_1990_CONTENT_IDS.debuggingSkill, JANUARY_1990_REASON_CODES.validationFixProject],
    [
      JANUARY_1990_CONTENT_IDS.toolUseSkill,
      accessRoute === "home-pc"
        ? JANUARY_1990_REASON_CODES.homePcAccess
        : JANUARY_1990_REASON_CODES.sharedSchoolPcAccess,
    ],
  ]);
  if (
    evidence.length !== expected.size ||
    evidence.some((item) => expected.get(item.skillId) !== item.reasonCode) ||
    new Set(evidence.map((item) => item.skillId)).size !== expected.size
  ) {
    throw new TypeError("January professional source requires complete canonical skill evidence");
  }
}

function exactRecord(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("Professional assessment must be a plain record");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError("Professional assessment contains unknown or missing fields");
  }
  return value as Readonly<Record<string, unknown>>;
}
