import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
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
export const JANUARY_SCENARIO_ARTIFACT_PATH = resolve(
  repositoryRoot,
  "apps",
  "desktop",
  "public",
  "scenarios",
  "january-1990.json",
);

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

export function serializeJanuaryScenarioArtifact(artifact: ScenarioArtifactV1): string {
  return `${canonicalizeAuthoritative(artifact)}\n`;
}

export async function writeJanuaryScenarioArtifact(): Promise<void> {
  const serialized = serializeJanuaryScenarioArtifact(await buildJanuaryScenarioArtifact());
  await mkdir(dirname(JANUARY_SCENARIO_ARTIFACT_PATH), { recursive: true });
  await writeFile(JANUARY_SCENARIO_ARTIFACT_PATH, serialized, "utf8");
}

export async function checkJanuaryScenarioArtifact(): Promise<void> {
  const expected = serializeJanuaryScenarioArtifact(await buildJanuaryScenarioArtifact());
  let actual: string;
  try {
    actual = await readFile(JANUARY_SCENARIO_ARTIFACT_PATH, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      throw new Error(
        `January scenario artifact is missing: ${JANUARY_SCENARIO_ARTIFACT_PATH}. Run pnpm scenario:build.`,
      );
    }
    throw error;
  }
  if (actual !== expected) {
    throw new Error("January scenario artifact is stale. Run pnpm scenario:build.");
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function main(arguments_: readonly string[]): Promise<void> {
  if (arguments_.length === 0) {
    await writeJanuaryScenarioArtifact();
    console.log(`Wrote ${JANUARY_SCENARIO_ARTIFACT_PATH}`);
    return;
  }
  if (arguments_.length === 1 && arguments_[0] === "--check") {
    await checkJanuaryScenarioArtifact();
    console.log("January scenario artifact is current.");
    return;
  }
  throw new TypeError("Usage: pnpm scenario:build | pnpm scenario:check");
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
