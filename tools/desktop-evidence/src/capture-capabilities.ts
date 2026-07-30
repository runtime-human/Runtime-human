import {
  createTauriCapabilities,
  type TauriCapabilities,
} from "@wdio/tauri-service";

export function createStartupEvidenceCapabilities(
  binaryPath: string,
  isolatedDataDirectory: string,
): TauriCapabilities {
  const capabilities = createTauriCapabilities(binaryPath, {
    appArgs: [`--runtime-human-evidence-data-dir=${isolatedDataDirectory}`],
    driverProvider: "embedded",
    embeddedPort: 4445,
    logLevel: "warn",
    startTimeout: 30_000,
  });

  capabilities["wdio:tauriServiceOptions"] = {
    ...capabilities["wdio:tauriServiceOptions"],
    captureBackendLogs: false,
    captureFrontendLogs: false,
  };

  return capabilities;
}
