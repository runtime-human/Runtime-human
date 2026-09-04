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
  const source = await loadJson<ScenarioAuthoringDocument>("source.json");
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
