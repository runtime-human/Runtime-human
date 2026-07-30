import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

describe("packaged desktop content CSP", () => {
  it("allows same-origin compiled-content fetches and Tauri IPC", async () => {
    const configText = await readFile(
      resolve(REPOSITORY_ROOT, "apps/desktop/src-tauri/tauri.conf.json"),
      "utf8",
    );
    const config = JSON.parse(configText) as {
      app: { security: { csp: string } };
    };
    const csp = config.app.security.csp;

    expect(csp).toMatch(/connect-src[^;]*'self'/u);
    expect(csp).toMatch(/connect-src[^;]*ipc:/u);
    expect(csp).toMatch(/connect-src[^;]*http:\/\/ipc\.localhost/u);
  });
});
