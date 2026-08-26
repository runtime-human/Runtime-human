import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { UserConfig } from "vite";

const dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(async () => ({
  root: dirname,
  plugins: [
    ...(await storybookTest({
      configDir: fileURLToPath(new URL("./.storybook", import.meta.url)),
    })),
    {
      name: "vitest-browser-server-fix",
      config(config: UserConfig) {
        config.server ??= {};
        config.server.host = "127.0.0.1";
        delete config.server.port;
        delete config.server.strictPort;
      },
    },
  ],
  test: {
    name: "storybook-browser",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" as const }],
    },
  },
}));
