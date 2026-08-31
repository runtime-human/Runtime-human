import { describe, expect, it, vi } from "vitest";

import {
  captureRendererStartupDiagnostics,
  waitForFirstMeaningfulPaint,
} from "../tools/desktop-evidence/src/capture-browser";
import type { EvidenceBrowser } from "../tools/desktop-evidence/src/wdio-types";

function fakeBrowser(overrides: Readonly<Record<string, unknown>>): EvidenceBrowser {
  return overrides as unknown as EvidenceBrowser;
}

const DIAGNOSTICS = {
  readyState: "complete",
  locationHref: "http://tauri.localhost/",
  title: "Runtime Human",
  bodyText: "Не удалось запустить игровой сеанс",
  performanceEntries: [
    { name: "app.renderer_bootstrap", entryType: "mark" },
    { name: "app.react_shell_commit", entryType: "mark" },
  ],
  tauriCoreInvokeAvailable: true,
};

describe("desktop evidence renderer startup diagnostics", () => {
  it("captures bounded document, milestone and Tauri availability evidence", async () => {
    const browser = fakeBrowser({ execute: vi.fn().mockResolvedValue(DIAGNOSTICS) });

    await expect(captureRendererStartupDiagnostics(browser)).resolves.toEqual(DIAGNOSTICS);
  });

  it("includes renderer diagnostics when FMP times out", async () => {
    const browser = fakeBrowser({
      waitUntil: vi.fn(async () => {
        throw new Error("Runtime Human did not publish app.first_meaningful_paint");
      }),
      execute: vi.fn().mockResolvedValue(DIAGNOSTICS),
    });

    await expect(waitForFirstMeaningfulPaint(browser, 50)).rejects.toThrow(
      /rendererDiagnostics=.*Не удалось запустить игровой сеанс/u,
    );
  });
});
