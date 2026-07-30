import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createStartupEvidenceCapabilities } from "../tools/desktop-evidence/src/capture-capabilities";

describe("desktop evidence WebDriver capabilities", () => {
  it("uses the embedded evidence-only WebDriver server", () => {
    const isolatedRoot = resolve("temporary-evidence-root");
    const capabilities = createStartupEvidenceCapabilities(
      resolve("runtime-human-desktop.exe"),
      isolatedRoot,
    ) as Record<string, unknown>;

    expect(capabilities["tauri:options"]).toEqual({
      application: resolve("runtime-human-desktop.exe"),
      args: [`--runtime-human-evidence-data-dir=${isolatedRoot}`],
    });
    expect(capabilities["wdio:tauriServiceOptions"]).toMatchObject({
      driverProvider: "embedded",
      embeddedPort: 4445,
      captureBackendLogs: false,
      captureFrontendLogs: false,
    });
    expect(capabilities).not.toHaveProperty("ms:edgeOptions");
  });
});
