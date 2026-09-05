import {
  createJanuary1990Runtime,
  createJanuary1990ScenarioRuntime,
  type PersistenceService,
} from "@runtime-human/game-application";
import {
  parseMonthRunId,
  parseSaveId,
  type MonthRunId,
  type SaveId,
} from "@runtime-human/game-schema";

import {
  createBrowserPerformanceRecorder,
  NOOP_PERFORMANCE_RECORDER,
  type PerformanceRecorder,
} from "../performance/performance-recorder";
import { ensureJanuarySave } from "./bootstrap-january-save";
import {
  createJanuarySessionController,
  type JanuarySessionController,
} from "./january-session-controller";
import { loadJanuaryContentRegistry, type JanuaryContentFetchPort } from "./load-january-content";
import {
  loadJanuaryScenarioArtifact,
  type JanuaryScenarioArtifactFetchPort,
} from "./load-january-scenario-artifact";
import { createTauriPersistenceService } from "./tauri-persistence";

export const DESKTOP_JANUARY_SAVE_ID = parseSaveId("runtime-human-january-1990");
export const DESKTOP_JANUARY_RUN_ID = parseMonthRunId("runtime-human-january-1990-run");
export const DESKTOP_JANUARY_SEED = 42n;

export type DesktopJanuaryRuntimeMode = "legacy" | "scenario";

export type CreateDesktopJanuarySessionInput = Readonly<{
  persistence: PersistenceService;
  fetchContent: JanuaryContentFetchPort;
  fetchScenarioArtifact?: JanuaryScenarioArtifactFetchPort;
  runtimeMode?: DesktopJanuaryRuntimeMode;
  saveId?: SaveId;
  runId?: MonthRunId;
  seed?: bigint;
  performance?: PerformanceRecorder;
}>;

export async function createDesktopJanuarySession(
  input: CreateDesktopJanuarySessionInput,
): Promise<JanuarySessionController> {
  const performance = input.performance ?? NOOP_PERFORMANCE_RECORDER;
  return performance.measure("app.session_bootstrap", async () => {
    const saveId = input.saveId ?? DESKTOP_JANUARY_SAVE_ID;
    const runId = input.runId ?? DESKTOP_JANUARY_RUN_ID;
    const runtimeMode = input.runtimeMode ?? "legacy";
    const scenarioArtifactPromise =
      runtimeMode === "scenario"
        ? loadJanuaryScenarioArtifact(input.fetchScenarioArtifact ?? input.fetchContent)
        : Promise.resolve(null);
    const [contentRegistry, scenarioArtifact] = await Promise.all([
      loadJanuaryContentRegistry(input.fetchContent, performance),
      scenarioArtifactPromise,
      ensureJanuarySave(input.persistence, saveId),
    ]);
    const runtime =
      scenarioArtifact === null
        ? createJanuary1990Runtime({
            persistence: input.persistence,
            contentRegistry,
          })
        : createJanuary1990ScenarioRuntime({
            persistence: input.persistence,
            contentRegistry,
            artifact: scenarioArtifact,
          });
    const controller = createJanuarySessionController({
      runtime,
      saveId,
      runId,
      seed: input.seed ?? DESKTOP_JANUARY_SEED,
      performance,
    });
    await controller.load();
    return controller;
  });
}

let defaultSession: Promise<JanuarySessionController> | null = null;

export function getDesktopJanuarySession(): Promise<JanuarySessionController> {
  defaultSession ??= createDesktopJanuarySession({
    persistence: createTauriPersistenceService(),
    fetchContent: (input, init) => fetch(input, init),
    performance: createBrowserPerformanceRecorder(),
  });
  return defaultSession;
}
