import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { fingerprint } from "@runtime-human/game-core";
import {
  certifyScenarioProgramV1,
  compileScenarioProgramV1,
  resolveScenarioCapabilitiesV1,
} from "@runtime-human/game-devtools";
import type {
  ScenarioArtifactV1,
  ScenarioCapabilityRegistryV1,
  ScenarioExecutionPolicyV1,
} from "@runtime-human/game-schema";

const ROOT = resolve(process.cwd(), "tools", "scenario-shadow", "january-1990");

async function loadJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(ROOT, name), "utf8")) as T;
}

export async function loadJanuaryScenarioArtifactV1(): Promise<ScenarioArtifactV1> {
  return buildJanuaryScenarioArtifactV1(await loadJson<ScenarioAuthoringDocument>("source.json"));
}

export async function loadJanuaryScenarioDispatchProbeArtifactV1(): Promise<ScenarioArtifactV1> {
  return buildJanuaryScenarioArtifactV1({
    schemaVersion: "scenario-v1",
    id: "january-1990.shadow-proof",
    entry: "a-access",
    nodes: {
      "a-access": {
        kind: "decision",
        decisionId: "january-1990/access",
        next: "b-learning",
      },
      "b-learning": {
        kind: "decision",
        decisionId: "january-1990/learning",
        next: "c-access-materialize",
      },
      "c-access-materialize": {
        kind: "provider",
        providerId: "january-1990.access-materialize",
        next: "d-work-materialize",
      },
      "d-work-materialize": {
        kind: "provider",
        providerId: "january-1990.work-materialize",
        next: "e-defect-select",
      },
      "e-defect-select": {
        kind: "random-content",
        poolId: "january-1990.defect-events",
        next: "f-defect",
      },
      "f-defect": {
        kind: "decision",
        decisionId: "january-1990/defect",
        next: "g-programming-outcome",
      },
      "g-programming-outcome": {
        kind: "provider",
        providerId: "january-1990.programming-outcome",
        next: "h-complete",
      },
      "h-complete": {
        kind: "complete",
      },
    },
  });
}

export async function loadJanuaryScenarioInvalidDomainOrderProbeArtifactV1(): Promise<ScenarioArtifactV1> {
  return buildJanuaryScenarioArtifactV1({
    schemaVersion: "scenario-v1",
    id: "january-1990.shadow-proof",
    entry: "a-access-materialize",
    nodes: {
      "a-access-materialize": {
        kind: "provider",
        providerId: "january-1990.access-materialize",
        next: "b-access",
      },
      "b-access": {
        kind: "decision",
        decisionId: "january-1990/access",
        next: "c-learning",
      },
      "c-learning": {
        kind: "decision",
        decisionId: "january-1990/learning",
        next: "d-work-materialize",
      },
      "d-work-materialize": {
        kind: "provider",
        providerId: "january-1990.work-materialize",
        next: "e-defect-select",
      },
      "e-defect-select": {
        kind: "random-content",
        poolId: "january-1990.defect-events",
        next: "f-defect",
      },
      "f-defect": {
        kind: "decision",
        decisionId: "january-1990/defect",
        next: "g-programming-outcome",
      },
      "g-programming-outcome": {
        kind: "provider",
        providerId: "january-1990.programming-outcome",
        next: "h-complete",
      },
      "h-complete": {
        kind: "complete",
      },
    },
  });
}

export async function loadJanuaryScenarioDuplicateDecisionProbeArtifactV1(): Promise<ScenarioArtifactV1> {
  return buildJanuaryScenarioArtifactV1({
    schemaVersion: "scenario-v1",
    id: "january-1990.shadow-proof",
    entry: "a-access",
    nodes: {
      "a-access": {
        kind: "decision",
        decisionId: "january-1990/access",
        next: "b-access-duplicate",
      },
      "b-access-duplicate": {
        kind: "decision",
        decisionId: "january-1990/access",
        next: "c-defect",
      },
      "c-defect": {
        kind: "decision",
        decisionId: "january-1990/defect",
        next: "d-access-materialize",
      },
      "d-access-materialize": {
        kind: "provider",
        providerId: "january-1990.access-materialize",
        next: "e-work-materialize",
      },
      "e-work-materialize": {
        kind: "provider",
        providerId: "january-1990.work-materialize",
        next: "f-defect-select",
      },
      "f-defect-select": {
        kind: "random-content",
        poolId: "january-1990.defect-events",
        next: "g-programming-outcome",
      },
      "g-programming-outcome": {
        kind: "provider",
        providerId: "january-1990.programming-outcome",
        next: "h-complete",
      },
      "h-complete": {
        kind: "complete",
      },
    },
  });
}

export async function loadJanuaryScenarioDuplicateProviderProbeArtifactV1(): Promise<ScenarioArtifactV1> {
  return buildJanuaryScenarioArtifactV1({
    schemaVersion: "scenario-v1",
    id: "january-1990.shadow-proof",
    entry: "a-access",
    nodes: {
      "a-access": {
        kind: "decision",
        decisionId: "january-1990/access",
        next: "b-access-materialize",
      },
      "b-access-materialize": {
        kind: "provider",
        providerId: "january-1990.access-materialize",
        next: "c-learning",
      },
      "c-learning": {
        kind: "decision",
        decisionId: "january-1990/learning",
        next: "d-access-materialize-duplicate",
      },
      "d-access-materialize-duplicate": {
        kind: "provider",
        providerId: "january-1990.access-materialize",
        next: "e-defect-select",
      },
      "e-defect-select": {
        kind: "random-content",
        poolId: "january-1990.defect-events",
        next: "f-defect",
      },
      "f-defect": {
        kind: "decision",
        decisionId: "january-1990/defect",
        next: "g-programming-outcome",
      },
      "g-programming-outcome": {
        kind: "provider",
        providerId: "january-1990.programming-outcome",
        next: "h-complete",
      },
      "h-complete": {
        kind: "complete",
      },
    },
  });
}

async function buildJanuaryScenarioArtifactV1(
  source: ScenarioAuthoringDocument,
): Promise<ScenarioArtifactV1> {
  const registry = await loadJson<ScenarioCapabilityRegistryV1>("registry.json");
  const policy = await loadJson<ScenarioExecutionPolicyV1>("policy.json");

  const compiled = compileScenarioProgramV1(source, { fingerprint });
  if (compiled.kind !== "success") throw new Error("January scenario source did not compile");

  const resolved = resolveScenarioCapabilitiesV1(compiled.program, registry, { fingerprint });
  if (resolved.kind !== "success") {
    throw new Error("January scenario capabilities did not resolve");
  }

  const certified = certifyScenarioProgramV1(
    compiled.program,
    policy,
    { fingerprint },
    resolved.capabilities,
  );
  if (certified.kind !== "success") throw new Error("January scenario program did not certify");

  return Object.freeze({
    schemaVersion: "scenario-artifact-v1",
    program: compiled.program,
    capabilities: resolved.capabilities,
    certificate: certified.certificate,
  });
}
