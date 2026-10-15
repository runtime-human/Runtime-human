import {
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type Fingerprint,
  type RequestId,
  type SaveId,
  type SaveRevision,
} from "@runtime-human/game-schema";

import type { CanonicalPayloadV1, SaveRecordV1, Sha256Hex } from "./contracts";
import { parseCanonicalPayload, parseFingerprint, parseSha256Hex } from "./parsers";
import { parseSaveRecord } from "./responses";

export type UpgradeProfessionalSaveCommandV1 = Readonly<{
  schemaVersion: "upgrade-professional-save-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  expectedUpdatedSequence: number;
  expectedSnapshotSha256: Sha256Hex;
  expectedSourceSaveSchemaFingerprint: Fingerprint;
  targetSaveSchemaFingerprint: Fingerprint;
  snapshot: CanonicalPayloadV1;
}>;

export type UpgradeProfessionalSaveAcceptedV1 = Readonly<{
  schemaVersion: "upgrade-professional-save-accepted-v1";
  save: SaveRecordV1;
}>;

export function parseUpgradeProfessionalSaveCommandV1(
  value: unknown,
): UpgradeProfessionalSaveCommandV1 {
  const raw = exactRecord(value, [
    "schemaVersion",
    "requestId",
    "saveId",
    "expectedSaveRevision",
    "expectedUpdatedSequence",
    "expectedSnapshotSha256",
    "expectedSourceSaveSchemaFingerprint",
    "targetSaveSchemaFingerprint",
    "snapshot",
  ]);
  if (raw.schemaVersion !== "upgrade-professional-save-command-v1") {
    throw new TypeError("Unsupported professional save upgrade command");
  }
  const expectedUpdatedSequence = raw.expectedUpdatedSequence;
  if (!Number.isSafeInteger(expectedUpdatedSequence) || (expectedUpdatedSequence as number) < 0) {
    throw new TypeError("Upgrade expected sequence is invalid");
  }
  const source = parseFingerprint(raw.expectedSourceSaveSchemaFingerprint);
  const target = parseFingerprint(raw.targetSaveSchemaFingerprint);
  if (source === target) throw new TypeError("Save upgrade must change the schema fingerprint");
  return Object.freeze({
    schemaVersion: "upgrade-professional-save-command-v1",
    requestId: parseRequestId(raw.requestId),
    saveId: parseSaveId(raw.saveId),
    expectedSaveRevision: parseSaveRevision(raw.expectedSaveRevision),
    expectedUpdatedSequence: expectedUpdatedSequence as number,
    expectedSnapshotSha256: parseSha256Hex(raw.expectedSnapshotSha256),
    expectedSourceSaveSchemaFingerprint: source,
    targetSaveSchemaFingerprint: target,
    snapshot: parseCanonicalPayload(raw.snapshot),
  });
}

export function parseUpgradeProfessionalSaveAcceptedV1(
  value: unknown,
): UpgradeProfessionalSaveAcceptedV1 {
  const raw = exactRecord(value, ["schemaVersion", "save"]);
  if (raw.schemaVersion !== "upgrade-professional-save-accepted-v1") {
    throw new TypeError("Unsupported professional upgrade response");
  }
  return Object.freeze({
    schemaVersion: "upgrade-professional-save-accepted-v1",
    save: parseSaveRecord(raw.save),
  });
}

function exactRecord(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Professional upgrade requires an object");
  }
  const raw = value as Record<string, unknown>;
  const actual = Object.keys(raw).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError("Professional upgrade has unknown or missing fields");
  }
  return raw;
}
