import {
  canonicalizeAuthoritative,
  fingerprint,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  parseJanuary1990Result,
  parseProfessionalLabEpisodeV1,
  sha256Hex,
  snapshotAuthoritativeValue,
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
 *
 * The value is opaque: it is only ever minted (and frozen) by
 * `projectCommittedJanuaryProfessionalSourceV1`, and
 * `createJanuaryProfessionalLabEpisodeV1` rejects any object that was not
 * minted there (spread copies, hand-built literals, mutated clones).
 *
 * @internal Lab/B2B plumbing, not a gameplay or UI-facing contract.
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

/**
 * Caller-supplied, provider-recorded bands for ONE committed source.
 *
 * @internal Lab-only. January v1 recorded none of these bands, so B2B must
 * feed provider-recorded values with provenance; they must never be derived
 * from quality scores or chosen by the player/renderer.
 */
export type JanuaryProfessionalLabAssessmentV1 = Readonly<{
  schemaVersion: "january-professional-lab-assessment-v1";
  sourceFingerprint: string;
  challenge: "guided" | "familiar";
  feedback: "limited" | "useful" | "thorough";
  outcome: "completed" | "partial" | "failed-with-learning" | "recovered";
}>;

/** Module-private mint registry: membership is the only proof a source is genuine. */
const MINTED_SOURCES = new WeakSet<object>();
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

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
  // B2A pins the first January commit: base revision 0 -> committed revision 1.
  // B2B (save candidate v2) must revisit this pin deliberately if a later
  // committed revision may ever carry a January month.
  if (save.lastCommittedRunId !== month.runId || month.baseSaveRevision + 1 !== save.revision) {
    throw new TypeError("Professional source committed run or save revision does not match");
  }

  const outcome = parseJanuary1990Result(month.terminalResult).programmingOutcome;
  requireJanuaryEvidence(outcome.evidence, outcome.accessRoute);
  const storedOutcome = month.outcomes.find(
    (entry) => entry.outcomeId === "january-1990/programming-outcome",
  );
  if (
    storedOutcome === undefined ||
    canonicalizeAuthoritative(storedOutcome.payload) !== canonicalizeAuthoritative(outcome)
  ) {
    throw new TypeError("Professional source stored outcome does not match the terminal result");
  }

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

  const source: JanuaryProfessionalSourceV1 = Object.freeze({
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
  MINTED_SOURCES.add(source);
  return source;
}

/**
 * Produces a LAB-only input, never a committed progression delta.
 * An explicit provider assessment is mandatory: January v1 did not record
 * verified challenge or feedback bands, nor a graded delivery outcome.
 * This first task cannot be classified as independent/complex challenge.
 *
 * @internal Lab-only; not a committed progression delta. Accepts only a source
 * minted by `projectCommittedJanuaryProfessionalSourceV1`.
 */
export function createJanuaryProfessionalLabEpisodeV1(
  source: JanuaryProfessionalSourceV1,
  assessment: JanuaryProfessionalLabAssessmentV1,
): ProfessionalLabEpisodeV1 {
  requireMintedSource(source);
  // Read every source field exactly once; later checks and the episode use the locals.
  const sourceFingerprint = source.sourceFingerprint;
  const episodeId = source.episodeId;
  const contextFingerprint = source.contextFingerprint;
  const participation = source.participation;
  const technologyId = source.technologyId;
  const skillIds = [...source.skillIds];
  if (
    source.schemaVersion !== "january-professional-source-v1" ||
    source.classificationStatus !== "requires-provider-assessment" ||
    source.monthIndex !== 0 ||
    !SHA256_PATTERN.test(sourceFingerprint) ||
    !SHA256_PATTERN.test(contextFingerprint) ||
    episodeId !== `jan90:${sourceFingerprint}` ||
    technologyId !== "gw-basic" ||
    (participation !== "assisted" && participation !== "independent") ||
    skillIds.length !== 2 ||
    skillIds[0] !== "debugging" ||
    skillIds[1] !== "programming"
  ) {
    throw new TypeError("Professional source is incompatible");
  }
  const approved = exactRecord(snapshotAssessment(assessment), [
    "challenge",
    "feedback",
    "outcome",
    "schemaVersion",
    "sourceFingerprint",
  ]);
  if (
    approved.schemaVersion !== "january-professional-lab-assessment-v1" ||
    approved.sourceFingerprint !== sourceFingerprint
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
    id: episodeId,
    monthIndex: 0,
    provider: "project",
    skillIds,
    technologyId,
    contextFingerprint,
    participation,
    challenge: approved.challenge,
    feedback: approved.feedback,
    outcome: approved.outcome,
  });
}

function requireMintedSource(source: unknown): void {
  if (typeof source !== "object" || source === null || !MINTED_SOURCES.has(source)) {
    throw new TypeError("Professional source was not minted from a committed January save");
  }
}

function snapshotAssessment(assessment: unknown): unknown {
  // One serialization pass detaches the caller's object (getters/proxies run once).
  try {
    return snapshotAuthoritativeValue(assessment);
  } catch {
    throw new TypeError("Professional assessment must be a plain record");
  }
}

function requireJanuaryEvidence(
  evidence: readonly Readonly<{ skillId: string; reasonCode: string }>[],
  accessRoute: "home-pc" | "shared-school-pc",
): void {
  const expected = new Map<string, string>([
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
  const actual = Object.keys(value).toSorted();
  const expected = keys.toSorted();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError("Professional assessment contains unknown or missing fields");
  }
  return value as Readonly<Record<string, unknown>>;
}
