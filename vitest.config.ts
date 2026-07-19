import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@runtime-human/game-schema": fileURLToPath(
        new URL("./packages/game-schema/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-core": fileURLToPath(
        new URL("./packages/game-core/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-ui": fileURLToPath(
        new URL("./packages/game-ui/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-ui-fixtures": fileURLToPath(
        new URL("./packages/game-ui-fixtures/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    clearMocks: true,
  },
});
