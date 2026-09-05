import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { JANUARY_1990_SCENARIO_ARTIFACT } from "@runtime-human/game-content";
import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";
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

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenarioRoot = resolve(repositoryRoot, "tools", "scenario-shadow", "january-1990");

export async function buildJanuaryScenarioArtifact(): Promise<ScenarioArtifactV1> {
  const [source, registry, policy] = await Promise.all([
    readJson<ScenarioAuthoringDocument>(resolve(scenarioRoot, "source.json")),
    readJson<ScenarioCapabilityRegistryV1>(resolve(scenarioRoot, "registry.json")),
    readJson<ScenarioExecutionPolicyV1>(resolve(scenarioRoot, "policy.json")),
  ]);

  const compiled = compileScenarioProgramV1(source, { fingerprint });
  if (compiled.kind !== "success") {
    throw new TypeError("Committed January scenario source did not compile");
  }

  const resolved = resolveScenarioCapabilitiesV1(compiled.program, registry, { fingerprint });
  if (resolved.kind !== "success") {
    throw new TypeError("Committed January scenario capabilities did not resolve");
  }

  const certified = certifyScenarioProgramV1(
    compiled.program,
    policy,
    { fingerprint },
    resolved.capabilities,
  );
  if (certified.kind !== "success") {
    throw new TypeError("Committed January scenario program did not certify");
  }

  return Object.freeze({
    schemaVersion: "scenario-artifact-v1",
    program: compiled.program,
    capabilities: resolved.capabilities,
    certificate: certified.certificate,
  });
}

export async function checkJanuaryScenarioArtifact(): Promise<void> {
  const expected = canonicalizeAuthoritative(await buildJanuaryScenarioArtifact());
  const actual = canonicalizeAuthoritative(JANUARY_1990_SCENARIO_ARTIFACT);

  if (actual !== expected) {
    throw new Error(
      "January production scenario artifact is stale relative to canonical source, registry or policy",
    );
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function main(arguments_: readonly string[]): Promise<void> {
  if (arguments_.length !== 0) {
    throw new TypeError("Usage: pnpm scenario:check");
  }

  await checkJanuaryScenarioArtifact();
  console.log("January production scenario artifact is current.");
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
