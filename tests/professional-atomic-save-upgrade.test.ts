import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildProfessionalSaveUpgradeCommandV1,
  inspectCommittedJanuaryProfessionalImportV2,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1,
  PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
} from "@runtime-human/game-application";
import { parseRequestId } from "@runtime-human/game-schema";
import { parseUpgradeProfessionalSaveCommandV1 } from "@runtime-human/game-persistence-contracts";

import {
  createHarnessedJanuaryRuntime,
  reachJanuaryDefectBoundary,
  requireJanuaryCommitted,
  resumeJanuary,
} from "./helpers/january-1990-runtime-fixture";

describe("PROG-01B2C1 atomic upgrade command preparation", () => {
  it("creates exact receipt-bound CAS command after committed January", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const defect = await reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);
    requireJanuaryCommitted(
      await resumeJanuary(source.runtime, defect, {
        requestId: "professional-upgrade-complete",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );
    const preview = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 500, learning: 500 },
    );
    expect(preview.kind).toBe("eligible-preview");
    const request = buildProfessionalSaveUpgradeCommandV1(
      preview,
      parseRequestId("professional-upgrade-v1"),
    );
    expect(request.expectedSaveRevision).toBe(1);
    expect(request.expectedSnapshotSha256).toBe(source.harness.getSave().snapshot.sha256);
    expect(request.expectedUpdatedSequence).toBe(source.harness.getSave().updatedSequence);
    expect(request.targetSaveSchemaFingerprint).toBe(PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT);
    expect(request.targetSaveSchemaFingerprint).toBe(
      "438d397a16781f85f67e787ee52e9fc611409df84e770082c080cfb4975e2420",
    );
    expect(parseUpgradeProfessionalSaveCommandV1(request)).toEqual(request);
    expect(source.harness.getSave().revision).toBe(1);
    expect(source.harness.getStats().commitMutations).toBe(1);
  });

  it("rejects preparation for a suspended January without sending an upgrade", async () => {
    const source = await createHarnessedJanuaryRuntime();
    await reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);
    const preview = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 500, learning: 500 },
    );
    expect(preview).toEqual({ kind: "blocked", reason: "active-month-run" });
    expect(() =>
      buildProfessionalSaveUpgradeCommandV1(preview, parseRequestId("upgrade-blocked")),
    ).toThrow(/eligible read-only preview/u);
    expect(source.harness.getStats().commitMutations).toBe(0);
  });

  it("rejects a different request payload under the same strict command schema", () => {
    expect(() =>
      parseUpgradeProfessionalSaveCommandV1({
        schemaVersion: "upgrade-professional-save-command-v1",
        requestId: "upgrade-id",
        saveId: "save-id",
        expectedSaveRevision: 1,
        expectedUpdatedSequence: 5,
        expectedSnapshotSha256: "a".repeat(64),
        expectedSourceSaveSchemaFingerprint: "b".repeat(64),
        targetSaveSchemaFingerprint: "b".repeat(64),
        snapshot: { schemaVersion: "canonical-payload-v1", json: "{}", sha256: "c".repeat(64) },
      }),
    ).toThrow(/must change the schema/u);
  });

  it("refuses to build a command with non-canonical aptitudes", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const defect = await reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);
    requireJanuaryCommitted(
      await resumeJanuary(source.runtime, defect, {
        requestId: "professional-upgrade-aptitudes",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );
    const preview = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      { reasoning: 501, learning: 500 },
    );
    expect(preview.kind).toBe("eligible-preview");
    expect(() =>
      buildProfessionalSaveUpgradeCommandV1(preview, parseRequestId("upgrade-aptitudes")),
    ).toThrow(/canonical default/u);
  });

  it("reports an idle January save as nothing-to-import and builds no command", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const preview = await inspectCommittedJanuaryProfessionalImportV2(
      source.harness.service,
      source.saveId,
      PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1,
    );
    expect(preview).toEqual({ kind: "blocked", reason: "nothing-to-import" });
    expect(() =>
      buildProfessionalSaveUpgradeCommandV1(preview, parseRequestId("upgrade-idle")),
    ).toThrow(/eligible read-only preview/u);
    expect(source.harness.getStats().commitMutations).toBe(0);
  });

  it("keeps the Rust persistence constants identical to the TypeScript contract", () => {
    const rust = readFileSync(
      new URL(
        "../apps/desktop/src-tauri/src/persistence/professional_upgrade_contract.rs",
        import.meta.url,
      ),
      "utf8",
    );
    const constant = (name: string): string => {
      const match = new RegExp(`const ${name}: [^=]+=\\s*"?([0-9a-f]+|\\d+)"?;`, "u").exec(rust);
      if (match?.[1] === undefined) {
        throw new Error(`missing Rust constant ${name}`);
      }
      return match[1];
    };
    expect(constant("PROFESSIONAL_TARGET_FINGERPRINT")).toBe(
      PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
    );
    expect(constant("JANUARY_1990_SAVE_SCHEMA_FINGERPRINT")).toBe(
      JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    );
    expect(PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1).toEqual({ reasoning: 500, learning: 500 });
    expect(constant("PROFESSIONAL_CANONICAL_DEFAULT_APTITUDE")).toBe(
      String(PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1.reasoning),
    );
    expect(PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1.learning).toBe(
      PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1.reasoning,
    );
  });
});
