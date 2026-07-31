import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

describe("fixed game shell native window contract", () => {
  it("keeps the Tauri minimum viewport aligned with the non-scrolling CSS shell", async () => {
    const [configText, css] = await Promise.all([
      readFile(resolve(REPOSITORY_ROOT, "apps/desktop/src-tauri/tauri.conf.json"), "utf8"),
      readFile(resolve(REPOSITORY_ROOT, "apps/desktop/src/shell/game-shell.css"), "utf8"),
    ]);
    const config = JSON.parse(configText) as {
      app: {
        windows: readonly {
          label: string;
          width: number;
          height: number;
          minWidth: number;
          minHeight: number;
        }[];
      };
    };
    const mainWindow = config.app.windows.find((window) => window.label === "main");

    expect(mainWindow).toMatchObject({
      width: 1280,
      height: 800,
      minWidth: 1180,
      minHeight: 720,
    });
    expect(css).toContain("min-width: 1180px");
    expect(css).toContain("min-height: 720px");
    expect(css).toMatch(/html,[\s\S]*body,[\s\S]*#root[\s\S]*overflow: hidden/u);
  });
});
