import { createJanuary1990Runtime, type PersistenceService } from "@runtime-human/game-application";
import {
  parseMonthRunId,
  parseSaveId,
  type MonthRunId,
  type SaveId,
} from "@runtime-human/game-schema";

import { ensureJanuarySave } from "./bootstrap-january-save";
import {
  createJanuarySessionController,
  type JanuarySessionController,
} from "./january-session-controller";
import { loadJanuaryContentRegistry, type JanuaryContentFetchPort } from "./load-january-content";
import { createTauriPersistenceService } from "./tauri-persistence";

export const DESKTOP_JANUARY_SAVE_ID = parseSaveId("runtime-human-january-1990");
export const DESKTOP_JANUARY_RUN_ID = parseMonthRunId("runtime-human-january-1990-run");
export const DESKTOP_JANUARY_SEED = 42n;

export type CreateDesktopJanuarySessionInput = Readonly<{
  persistence: PersistenceService;
  fetchContent: JanuaryContentFetchPort;
  saveId?: SaveId;
  runId?: MonthRunId;
  seed?: bigint;
}>;

export async function createDesktopJanuarySession(
  input: CreateDesktopJanuarySessionInput,
): Promise<JanuarySessionController> {
  const saveId = input.saveId ?? DESKTOP_JANUARY_SAVE_ID;
  const runId = input.runId ?? DESKTOP_JANUARY_RUN_ID;
  const [contentRegistry] = await Promise.all([
    loadJanuaryContentRegistry(input.fetchContent),
    ensureJanuarySave(input.persistence, saveId),
  ]);
  const controller = createJanuarySessionController({
    runtime: createJanuary1990Runtime({
      persistence: input.persistence,
      contentRegistry,
    }),
    saveId,
    runId,
    seed: input.seed ?? DESKTOP_JANUARY_SEED,
  });
  await controller.load();
  return controller;
}

let defaultSession: Promise<JanuarySessionController> | null = null;

export function getDesktopJanuarySession(): Promise<JanuarySessionController> {
  defaultSession ??= createDesktopJanuarySession({
    persistence: createTauriPersistenceService(),
    fetchContent: (input, init) => fetch(input, init),
  });
  return defaultSession;
}
