import { assertJanuary1990ScenarioRuntimeArtifactV1 } from "@runtime-human/game-core";
import type { ScenarioArtifactV1 } from "@runtime-human/game-schema";

export type JanuaryScenarioArtifactFetchPort = (
  input: string,
  init?: Readonly<{ cache?: RequestCache }>,
) => Promise<Readonly<{ ok: boolean; status: number; text(): Promise<string> }>>;

export const JANUARY_SCENARIO_ARTIFACT_URL = "/scenarios/january-1990.json";

export async function loadJanuaryScenarioArtifact(
  fetchArtifact: JanuaryScenarioArtifactFetchPort,
): Promise<ScenarioArtifactV1> {
  const response = await fetchArtifact(JANUARY_SCENARIO_ARTIFACT_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить сценарий ${JANUARY_SCENARIO_ARTIFACT_URL}: HTTP ${response.status}`,
    );
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(await response.text()) as unknown;
  } catch {
    throw new TypeError("January scenario runtime artifact is not valid JSON");
  }
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("January scenario runtime artifact is malformed");
  }

  const artifact = candidate as ScenarioArtifactV1;
  assertJanuary1990ScenarioRuntimeArtifactV1(artifact);
  return artifact;
}
