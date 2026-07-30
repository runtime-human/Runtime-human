import { join } from "node:path";

import {
  createTauriCapabilities,
  type TauriCapabilities,
} from "@wdio/tauri-service";

export type StartupEvidenceCapabilities = TauriCapabilities &
  Readonly<{
    "ms:edgeOptions": Readonly<{
      webviewOptions: Readonly<{
        userDataFolder: string;
      }>;
    }>;
  }>;

export function createStartupEvidenceCapabilities(
  binaryPath: string,
  isolatedDataDirectory: string,
): StartupEvidenceCapabilities {
  const capabilities = createTauriCapabilities(binaryPath, {
    appArgs: [`--runtime-human-evidence-data-dir=${isolatedDataDirectory}`],
    autoInstallTauriDriver: false,
    driverProvider: "external",
    logLevel: "warn",
    startTimeout: 30_000,
  }) as StartupEvidenceCapabilities;

  capabilities["wdio:tauriServiceOptions"] = {
    ...capabilities["wdio:tauriServiceOptions"],
    autoDownloadEdgeDriver: true,
    captureBackendLogs: false,
    captureFrontendLogs: false,
  };
  capabilities["ms:edgeOptions"] = {
    webviewOptions: {
      userDataFolder: join(isolatedDataDirectory, "webview"),
    },
  };

  return capabilities;
}
