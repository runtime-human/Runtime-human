import {
  MAX_CANONICAL_PAYLOAD_BYTES,
  parseBeginPersistedMonthRunCommand,
  parseCanonicalPayload,
  parseCommitPersistedMonthRunCommand,
} from "@runtime-human/game-persistence-contracts";

const HASH = "a".repeat(64);
const PREVIOUS_HASH = "b".repeat(64);

function canonicalPayload(json: string) {
  return {
    schemaVersion: "canonical-payload-v1" as const,
    json,
    sha256: HASH,
  };
}

describe("persistence contract boundaries", () => {
  it("measures canonical payload limits in UTF-8 bytes", () => {
    const astralCharacters = "😀".repeat((MAX_CANONICAL_PAYLOAD_BYTES - 4) / 4);
    const atLimit = JSON.stringify(`aa${astralCharacters}`);
    const overLimit = JSON.stringify(`aaa${astralCharacters}`);

    expect(parseCanonicalPayload(canonicalPayload(atLimit)).json).toBe(atLimit);
    expect(() => parseCanonicalPayload(canonicalPayload(overLimit))).toThrow(
      `Canonical payload byte limit is ${MAX_CANONICAL_PAYLOAD_BYTES}`,
    );
  });

  it("compares checkpoint compatibility independently of object key insertion order", () => {
    const compatibility = { alpha: 1, é: 2, é: 3, omega: 4 };
    const checkpointCompatibility = { omega: 4, é: 3, é: 2, alpha: 1 };

    const parsed = parseBeginPersistedMonthRunCommand({
      schemaVersion: "begin-persisted-month-run-command-v1",
      requestId: "begin-key-order",
      saveId: "save-key-order",
      expectedSaveRevision: 0,
      runId: "run-key-order",
      checkpoint: canonicalPayload(
        JSON.stringify({
          schemaVersion: "month-run-checkpoint-v1",
          saveId: "save-key-order",
          runId: "run-key-order",
          baseSaveRevision: 0,
          runRevision: 0,
          status: "ready",
          compatibility: checkpointCompatibility,
          previousCheckpointHash: null,
          checkpointHash: HASH,
        }),
      ),
      compatibility: canonicalPayload(JSON.stringify(compatibility)),
    });

    expect(parsed.runId).toBe("run-key-order");
  });

  it("rejects a commit when the durable revision cannot advance safely", () => {
    const committedCheckpoint = canonicalPayload(
      JSON.stringify({
        schemaVersion: "month-run-checkpoint-v1",
        saveId: "save-revision-boundary",
        runId: "run-revision-boundary",
        baseSaveRevision: 0,
        runRevision: Number.MAX_SAFE_INTEGER,
        status: "committed",
        compatibility: {},
        previousCheckpointHash: PREVIOUS_HASH,
        checkpointHash: HASH,
      }),
    );

    expect(() =>
      parseCommitPersistedMonthRunCommand({
        schemaVersion: "commit-persisted-month-run-command-v1",
        requestId: "commit-revision-boundary",
        saveId: "save-revision-boundary",
        runId: "run-revision-boundary",
        expectedSaveRevision: 0,
        expectedRunRevision: Number.MAX_SAFE_INTEGER,
        expectedCheckpointPayloadSha256: HASH,
        expectedCheckpointHash: PREVIOUS_HASH,
        committedCheckpoint,
        snapshot: canonicalPayload("{}"),
        result: canonicalPayload("{}"),
      }),
    ).toThrow("Expected MonthRun revision cannot advance beyond the safe integer range");
  });
});
