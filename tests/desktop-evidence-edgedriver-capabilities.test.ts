import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createStartupEvidenceCapabilities } from "../tools/desktop-evidence/src/capture-capabilities";

describe("desktop evidence EdgeDriver capabilities", () => {
  it("delegates the transient WebView2 profile and debug endpoint to EdgeDriver", () => {
    const isolatedRoot = resolve("temporary-evidence-root");
    const capabilities = createStartupEvidenceCapabilities(
      resolve("runtime-human-desktop.exe"),
      isolatedRoot,
    ) as Record<string, unknown>;

    expect(capabilities["tauri:options"]).toEqual({
      application: resolve("runtime-human-desktop.exe"),
      args: [`--runtime-human-evidence-data-dir=${isolatedRoot}`],
    });
    expect(capabilities).not.toHaveProperty("ms:edgeOptions");
  });
});
