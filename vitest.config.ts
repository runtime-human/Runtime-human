import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

function nodeProject(name: string, include: string[]) {
  return {
    extends: true as const,
    test: {
      name,
      environment: "node",
      globals: true,
      clearMocks: true,
      setupFiles: [],
      include,
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@runtime-human/game-schema": fileURLToPath(
        new URL("./packages/game-schema/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-core": fileURLToPath(
        new URL("./packages/game-core/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-application": fileURLToPath(
        new URL("./packages/game-application/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-content": fileURLToPath(
        new URL("./packages/game-content/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-content-compiler": fileURLToPath(
        new URL("./packages/game-content-compiler/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-devtools": fileURLToPath(
        new URL("./packages/game-devtools/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-simulation": fileURLToPath(
        new URL("./packages/game-simulation/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-authoring-schema": fileURLToPath(
        new URL("./packages/game-authoring-schema/src/index.ts", import.meta.url),
      ),
      "@runtime-human/game-persistence-contracts": fileURLToPath(
        new URL("./packages/game-persistence-contracts/src/index.ts", import.meta.url),
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
    projects: [
      nodeProject("core-node", [
        "tests/determinism-golden.test.ts",
        "tests/determinism-manifest.test.ts",
        "tests/deterministic-hash.test.ts",
        "tests/xoshiro256ss.test.ts",
        "tests/month-run-checkpoint.test.ts",
        "tests/month-run-idempotency.test.ts",
        "tests/month-run-runner.test.ts",
        "tests/month-run-schema.test.ts",
        "tests/month-run-transition.test.ts",
        "tests/january-1990-contracts.test.ts",
        "tests/january-1990-exactly-once.test.ts",
        "tests/january-1990-month-plan.test.ts",
        "tests/january-1990-month-run.test.ts",
        "tests/january-1990-provisional-state.test.ts",
        "tests/january-1990-result-summary.test.ts",
        "tests/january-1990-screen-model.test.ts",
        "tests/january-1990-view-model.test.ts",
        "tests/january-1990-balance.test.ts",
        "tests/january-1990-balance-trace.test.ts",
        "tests/january-1990-content-projection.test.ts",
        "tests/january-1990-simulation-properties.test.ts",
        "tests/january-1990-rng-shadow.test.ts",
        "tests/january-1990-rng-evidence.test.ts",
        "tests/january-1990-rng-authority-cutover.test.ts",
        "tests/january-1990-quality-explain.test.ts",
        "tests/january-1990-harness-proof.test.ts",
        "tests/simulation-compare.test.ts",
        "tests/gameplay-fixture-parser.test.ts",
      ]),
      nodeProject("application-node", [
        "tests/career-overview-model.test.ts",
        "tests/persistence-application.test.ts",
        "tests/persistence-service.test.ts",
        "tests/persisted-month-run-orchestrator.test.ts",
        "tests/persisted-month-run-restart.test.ts",
        "tests/january-1990-application-baseline.perf.test.ts",
        "tests/january-1990-desktop-bootstrap.test.ts",
        "tests/january-1990-desktop-concurrency.test.ts",
        "tests/january-1990-desktop-performance.test.ts",
        "tests/january-1990-desktop-session.test.ts",
        "tests/january-1990-persistence-flow.test.ts",
        "tests/january-1990-persisted-restart.test.ts",
        "tests/january-1990-persisted-run.test.ts",
        "tests/january-1990-rng-application-cutover.test.ts",
      ]),
      nodeProject("content-node", [
        "tests/compiled-content-runtime-loader.test.ts",
        "tests/content-artifact-writer.test.ts",
        "tests/content-build-project.test.ts",
        "tests/content-catalog-projection.test.ts",
        "tests/content-compiler-bundle-boundary.test.ts",
        "tests/content-compiler-chronology-boundaries.test.ts",
        "tests/content-compiler-golden.test.ts",
        "tests/content-compiler-invariants.test.ts",
        "tests/content-compiler-ordering.test.ts",
        "tests/content-compiler-parser-boundary.test.ts",
        "tests/content-compiler.test.ts",
        "tests/content-source-loader.test.ts",
        "tests/january-content-golden.test.ts",
        "tests/materialize-january-e2-fixtures.test.ts",
      ]),
      nodeProject("persistence-contracts-node", [
        "tests/january-1990-save-snapshot.test.ts",
        "tests/month-run-persistence-payload.test.ts",
        "tests/persistence-contract-boundaries.test.ts",
      ]),
      nodeProject("tooling-node", [
        "tests/authoritative-json.test.ts",
        "tests/authoring-schema-equivalence.test.ts",
        "tests/balance-authoring-schema-parity.test.ts",
        "tests/check-boundaries.test.ts",
        "tests/check-build-only-dependencies.test.ts",
        "tests/ci-feedback-candidate.test.ts",
        "tests/desktop-content-csp.test.ts",
        "tests/desktop-e3-series-workflow.test.ts",
        "tests/desktop-evidence-runtime-contract.test.ts",
        "tests/desktop-performance-evidence.test.ts",
        "tests/desktop-performance-evidence-cli.test.ts",
        "tests/desktop-route.test.ts",
        "tests/docs-metadata-governance.test.ts",
        "tests/game-devtools-catalog.test.ts",
        "tests/gamectl-capabilities.test.ts",
        "tests/gamectl-cli.test.ts",
        "tests/gamectl-simulation-cli.test.ts",
        "tests/gamectl-harness-cli.test.ts",
        "tests/performance-recorder.test.ts",
        "tests/performance-summary.test.ts",
        "tests/remote-command.test.ts",
        "tests/remote-command-result.test.ts",
        "tests/renderer-milestones.test.ts",
        "tests/runtime-human-design-tokens.test.ts",
        "tests/studio-context.test.ts",
        "tests/studio-findings.test.ts",
        "tests/studio-harness.test.ts",
        "tests/studio-pr-evidence.test.ts",
        "tests/studio-routing.test.ts",
        "tests/studioctl-cli.test.ts",
        "tests/versioning.test.ts",
      ]),
      {
        extends: true,
        test: {
          name: "ui-jsdom",
          environment: "jsdom",
          globals: true,
          clearMocks: true,
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/**/*.test.tsx", "tests/game-shell-window-contract.test.ts"],
        },
      },
      "./apps/desktop/vitest.config.ts",
    ],
  },
});
