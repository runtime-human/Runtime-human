import {
  createJanuary1990MonthPlan,
  createJanuary1990ScenarioMonthSteps,
  JANUARY_1990_DEFAULT_BALANCE,
  type January1990BalanceV1,
} from "@runtime-human/game-core";
import type { ScenarioArtifactV1 } from "@runtime-human/game-schema";

import { createPersistedMonthRunOrchestrator } from "../persisted-month-run-orchestrator";
import type { PersistenceService } from "../persistence-service";
import {
  createJanuary1990BeginCommand,
  createJanuary1990ResumeCommand,
} from "./january-commands";
import { materializeJanuary1990Commit } from "./january-commit-materializer";
import type { JanuaryContentRegistryPort } from "./january-content-registry-port";
import type { January1990Runtime } from "./create-january-runtime";
import { createJanuary1990ScenarioCompatibility } from "./january-scenario-compatibility";
import { projectJanuary1990Content } from "./project-january-content";

export type CreateJanuary1990ScenarioRuntimeInput = Readonly<{
  persistence: PersistenceService;
  contentRegistry: JanuaryContentRegistryPort;
  artifact: ScenarioArtifactV1;
  balance?: January1990BalanceV1;
}>;

export function createJanuary1990ScenarioRuntime(
  input: CreateJanuary1990ScenarioRuntimeInput,
): January1990Runtime {
  const balance = input.balance ?? JANUARY_1990_DEFAULT_BALANCE;
  const contentContext = projectJanuary1990Content(input.contentRegistry);
  const plan = createJanuary1990MonthPlan(contentContext);
  const compatibility = createJanuary1990ScenarioCompatibility({
    contentFingerprint: contentContext.contentFingerprint,
    balance,
    artifact: input.artifact,
  });
  const orchestrator = createPersistedMonthRunOrchestrator({
    persistence: input.persistence,
    steps: createJanuary1990ScenarioMonthSteps(contentContext, balance, input.artifact),
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
