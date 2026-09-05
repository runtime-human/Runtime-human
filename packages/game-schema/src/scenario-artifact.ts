import type { ScenarioResolvedCapabilitiesV1 } from "./scenario-capabilities";
import type { ScenarioCertificateV1 } from "./scenario-certificate";
import type { ScenarioProgramV1 } from "./scenario-program";

export const SCENARIO_ARTIFACT_SCHEMA_VERSION = "scenario-artifact-v1" as const;

export type ScenarioArtifactV1 = Readonly<{
  schemaVersion: typeof SCENARIO_ARTIFACT_SCHEMA_VERSION;
  program: ScenarioProgramV1;
  capabilities: ScenarioResolvedCapabilitiesV1;
  certificate: ScenarioCertificateV1;
}>;
