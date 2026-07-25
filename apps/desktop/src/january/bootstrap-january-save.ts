import {
  createCanonicalPayload,
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  type PersistenceService,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import { parseRequestId, type SaveId } from "@runtime-human/game-schema";

export async function ensureJanuarySave(
  persistence: PersistenceService,
  saveId: SaveId,
): Promise<void> {
  const loaded = await persistence.loadSave({
    schemaVersion: "load-save-query-v1",
    saveId,
  });
  if (loaded.kind === "found") return;
  if (loaded.kind === "rejected") {
    throw new Error(`Не удалось загрузить сохранение: ${loaded.error.message}`);
  }

  const created = await persistence.createSave({
    schemaVersion: "create-save-command-v1",
    requestId: parseRequestId(
      fingerprint("january-1990-desktop-save-bootstrap-v1", { saveId }),
    ),
    saveId,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    snapshot: createCanonicalPayload(createJanuary1990InitialSaveSnapshot()),
  });
  if (created.kind === "accepted" || created.kind === "duplicate") return;
  throw new Error(`Не удалось создать сохранение: ${created.error.message}`);
}
