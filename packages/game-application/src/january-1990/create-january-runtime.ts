import {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  type January1990ContentContext,
  type January1990MonthPlanV1,
} from "@runtime-human/game-core";
import type { Fingerprint, MonthRunCompatibilityV1, SaveId } from "@runtime-human/game-schema";

import { createPersistedMonthRunOrchestrator } from "../persisted-month-run-orchestrator";
import type { PersistedMonthRunResult } from "../persisted-month-run-types";
import type { PersistenceService } from "../persistence-service";
import {
  createJanuary1990BeginCommand,
  createJanuary1990ResumeCommand,
  type January1990BeginInput,
  type January1990ResumeInput,
} from "./january-commands";
import { createJanuary1990Compatibility } from "./january-compatibility";
import { materializeJanuary1990Commit } from "./january-commit-materializer";
import type { JanuaryContentRegistryPort } from "./january-content-registry-port";
import { projectJanuary1990Content } from "./project-january-content";

export type CreateJanuary1990RuntimeInput = Readonly<{
  persistence: PersistenceService;
  contentRegistry: JanuaryContentRegistryPort;
  saveSchemaFingerprint: Fingerprint;
}>;

export type January1990Runtime = Readonly<{
  contentContext: January1990ContentContext;
  plan: January1990MonthPlanV1;
  compatibility: MonthRunCompatibilityV1;
  load(saveId: SaveId): Promise<PersistedMonthRunResult>;
  begin(input: January1990BeginInput): Promise<PersistedMonthRunResult>;
  resume(input: January1990ResumeInput): Promise<PersistedMonthRunResult>;
  retry(): Promise<PersistedMonthRunResult>;
}>;

export function createJanuary1990Runtime(input: CreateJanuary1990RuntimeInput): January1990Runtime {
  const contentContext = projectJanuary1990Content(input.contentRegistry);
  const plan = createJanuary1990MonthPlan(contentContext);
  const compatibility = createJanuary1990Compatibility({
    contentFingerprint: contentContext.contentFingerprint,
    saveSchemaFingerprint: input.saveSchemaFingerprint,
  });
  const orchestrator = createPersistedMonthRunOrchestrator({
    persistence: input.persistence,
    steps: createJanuary1990MonthSteps(contentContext),
    expectedCompatibility: compatibility,
    materializeCommit: materializeJanuary1990Commit,
  });

  return Object.freeze({
    contentContext,
    plan,
    compatibility,
    load(saveId) {
      return orchestrator.load(saveId);
    },
    begin(beginInput) {
      return orchestrator.begin(
        createJanuary1990BeginCommand(contentContext, compatibility, beginInput),
      );
    },
    resume(resumeInput) {
      return orchestrator.resume(createJanuary1990ResumeCommand(resumeInput));
    },
    retry() {
      return orchestrator.retry();
    },
  });
}
