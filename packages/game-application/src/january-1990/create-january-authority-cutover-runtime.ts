import type { ScenarioArtifactV1 } from "@runtime-human/game-schema";

import type { PersistedMonthRunResult } from "../persisted-month-run-types";
import { createJanuary1990Runtime, type January1990Runtime } from "./create-january-runtime";
import {
  createJanuary1990ScenarioRuntime,
  type CreateJanuary1990ScenarioRuntimeInput,
} from "./create-january-scenario-runtime";

export type CreateJanuary1990AuthorityCutoverRuntimeInput = CreateJanuary1990ScenarioRuntimeInput &
  Readonly<{
    artifact: ScenarioArtifactV1;
  }>;

export function createJanuary1990AuthorityCutoverRuntime(
  input: CreateJanuary1990AuthorityCutoverRuntimeInput,
): January1990Runtime {
  const scenario = createJanuary1990ScenarioRuntime(input);
  const legacy = createJanuary1990Runtime(input);
  let selected: January1990Runtime | null = null;

  async function load(saveId: Parameters<January1990Runtime["load"]>[0]) {
    if (selected !== null) return selected.load(saveId);

    const scenarioResult = await scenario.load(saveId);
    if (!isIncompatibleCheckpoint(scenarioResult)) {
      selected = scenario;
      return scenarioResult;
    }

    const legacyResult = await legacy.load(saveId);
    if (!isIncompatibleCheckpoint(legacyResult)) selected = legacy;
    return legacyResult;
  }

  async function resume(inputValue: Parameters<January1990Runtime["resume"]>[0]) {
    if (selected !== null) return selected.resume(inputValue);

    const scenarioResult = await scenario.resume(inputValue);
    if (!isIncompatibleCheckpoint(scenarioResult)) {
      selected = scenario;
      return scenarioResult;
    }

    const legacyResult = await legacy.resume(inputValue);
    if (!isIncompatibleCheckpoint(legacyResult)) selected = legacy;
    return legacyResult;
  }

  return Object.freeze({
    contentContext: scenario.contentContext,
    plan: scenario.plan,
    compatibility: scenario.compatibility,
    load,
    begin(beginInput) {
      selected ??= scenario;
      return selected.begin(beginInput);
    },
    resume,
    retry() {
      return (selected ?? scenario).retry();
    },
  });
}

function isIncompatibleCheckpoint(result: PersistedMonthRunResult): boolean {
  return result.kind === "blocked" && result.reason === "incompatible-checkpoint";
}
