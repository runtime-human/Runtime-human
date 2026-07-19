#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function write(relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trimStart().replace(/\r\n/g, "\n") + "\n", "utf8");
}

const packageDefinitions = {
  "shared-kernel": { dependencies: [], references: [] },
  "game-schema": { dependencies: ["shared-kernel"], references: ["shared-kernel"] },
  "game-core": {
    dependencies: ["game-schema", "shared-kernel"],
    references: ["shared-kernel", "game-schema"],
  },
  "game-persistence-contracts": {
    dependencies: ["game-schema", "shared-kernel"],
    references: ["shared-kernel", "game-schema"],
  },
  "game-platform-contracts": {
    dependencies: ["game-schema", "shared-kernel"],
    references: ["shared-kernel", "game-schema"],
  },
  "game-application": {
    dependencies: [
      "game-core",
      "game-persistence-contracts",
      "game-platform-contracts",
      "game-schema",
      "shared-kernel",
    ],
    references: [
      "shared-kernel",
      "game-schema",
      "game-core",
      "game-persistence-contracts",
      "game-platform-contracts",
    ],
  },
  "game-content": {
    dependencies: ["game-schema", "shared-kernel"],
    references: ["shared-kernel", "game-schema"],
  },
};

for (const [name, definition] of Object.entries(packageDefinitions)) {
  write(
    `packages/${name}/package.json`,
    JSON.stringify(
      {
        name: `@runtime-human/${name}`,
        version: "0.0.1",
        private: true,
        type: "module",
        exports: { ".": "./src/index.ts" },
        ...(definition.dependencies.length > 0
          ? {
              dependencies: Object.fromEntries(
                definition.dependencies.map((dependency) => [
                  `@runtime-human/${dependency}`,
                  "workspace:*",
                ]),
              ),
            }
          : {}),
      },
      null,
      2,
    ),
  );

  write(
    `packages/${name}/tsconfig.json`,
    JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        compilerOptions: {
          rootDir: "src",
          outDir: "dist",
          tsBuildInfoFile: "dist/.tsbuildinfo",
          lib: ["ES2024"],
        },
        include: ["src/**/*.ts"],
        ...(definition.references.length > 0
          ? {
              references: definition.references.map((reference) => ({ path: `../${reference}` })),
            }
          : {}),
      },
      null,
      2,
    ),
  );

  write(`packages/${name}/src/index.ts`, "export {};");
}

write(
  "packages/game-ui/package.json",
  JSON.stringify(
    {
      name: "@runtime-human/game-ui",
      version: "0.0.1",
      private: true,
      type: "module",
      exports: { ".": "./src/index.ts" },
      peerDependencies: { react: "19.2.7" },
    },
    null,
    2,
  ),
);
write(
  "packages/game-ui/tsconfig.json",
  JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        rootDir: "src",
        outDir: "dist",
        tsBuildInfoFile: "dist/.tsbuildinfo",
        lib: ["ES2024", "DOM", "DOM.Iterable"],
        jsx: "react-jsx",
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
    },
    null,
    2,
  ),
);
write(
  "packages/game-ui/src/foundation-status.tsx",
  `import type { CSSProperties, JSX } from "react";

export interface FoundationCheck {
  readonly id: string;
  readonly label: string;
  readonly state: "ready" | "planned";
}

export interface FoundationStatusProps {
  readonly title: string;
  readonly summary: string;
  readonly checks: readonly FoundationCheck[];
}

const stateLabels = {
  ready: "Готово",
  planned: "Запланировано",
} as const;

const styles = {
  page: {
    boxSizing: "border-box",
    minHeight: "100vh",
    padding: "48px",
    background: "#f4f1e8",
    color: "#18211b",
    fontFamily: "system-ui, sans-serif",
  },
  panel: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "32px",
    border: "1px solid #89958c",
    borderRadius: "16px",
    background: "#fffdf7",
    boxShadow: "0 18px 60px rgba(24, 33, 27, 0.12)",
  },
  eyebrow: {
    margin: "0 0 8px",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: { margin: 0, fontSize: "clamp(2rem, 6vw, 4.5rem)", lineHeight: 1 },
  summary: { margin: "20px 0 28px", maxWidth: "62ch", lineHeight: 1.6 },
  list: { display: "grid", gap: "12px", padding: 0, listStyle: "none" },
  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    padding: "14px 16px",
    border: "1px solid #c8cec9",
    borderRadius: "10px",
  },
  state: { whiteSpace: "nowrap", fontWeight: 700 },
} satisfies Record<string, CSSProperties>;

export function FoundationStatus({ title, summary, checks }: FoundationStatusProps): JSX.Element {
  return (
    <main aria-labelledby="foundation-title" style={styles.page}>
      <section style={styles.panel}>
        <p style={styles.eyebrow}>Runtime Human · Foundation</p>
        <h1 id="foundation-title" style={styles.title}>
          {title}
        </h1>
        <p style={styles.summary}>{summary}</p>
        <ul aria-label="Состояние Foundation" style={styles.list}>
          {checks.map((check) => (
            <li key={check.id} style={styles.item}>
              <span>{check.label}</span>
              <span style={styles.state}>{stateLabels[check.state]}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
`,
);
write(
  "packages/game-ui/src/index.ts",
  `export { FoundationStatus } from "./foundation-status.js";
export type { FoundationCheck, FoundationStatusProps } from "./foundation-status.js";`,
);

write(
  "packages/game-ui-fixtures/package.json",
  JSON.stringify(
    {
      name: "@runtime-human/game-ui-fixtures",
      version: "0.0.1",
      private: true,
      type: "module",
      exports: { ".": "./src/index.ts" },
      dependencies: { "@runtime-human/game-ui": "workspace:*" },
    },
    null,
    2,
  ),
);
write(
  "packages/game-ui-fixtures/tsconfig.json",
  JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        rootDir: "src",
        outDir: "dist",
        tsBuildInfoFile: "dist/.tsbuildinfo",
        lib: ["ES2024"],
      },
      include: ["src/**/*.ts"],
      references: [{ path: "../game-ui" }],
    },
    null,
    2,
  ),
);
write(
  "packages/game-ui-fixtures/src/foundation-status.fixtures.ts",
  `import type { FoundationStatusProps } from "@runtime-human/game-ui";

export const foundationReadyFixture = {
  title: "Основание готово",
  summary:
    "Репозиторий получил воспроизводимую точку входа. Игровые системы ещё не реализованы — сейчас проверяются только стек, границы и поверхности разработки.",
  checks: [
    { id: "fixture.foundation.workspace.v1", label: "pnpm workspace", state: "ready" },
    { id: "fixture.foundation.typescript.v1", label: "TypeScript project references", state: "ready" },
    { id: "fixture.foundation.storybook.v1", label: "Storybook workshop", state: "ready" },
    { id: "fixture.foundation.persistence.v1", label: "SQLite и MonthRun", state: "planned" },
  ],
} as const satisfies FoundationStatusProps;

export const foundationLongRussianFixture = {
  title: "Техническое основание для длинного пути программиста",
  summary:
    "Этот специально длинный русскоязычный текст проверяет переносы, масштабирование и читаемость без сокращений, скрывающих смысл. Интерфейс должен оставаться понятным даже тогда, когда пояснение честно описывает ограничения текущего этапа и не обещает уже реализованную игру.",
  checks: [
    {
      id: "fixture.foundation.long-boundaries.v1",
      label: "Публичные границы пакетов без прямого доступа UI к формулам игрового ядра",
      state: "ready",
    },
    {
      id: "fixture.foundation.long-recovery.v1",
      label: "Сохранение, восстановление и приостановленный MonthRun будут добавлены отдельным PR",
      state: "planned",
    },
  ],
} as const satisfies FoundationStatusProps;
`,
);
write(
  "packages/game-ui-fixtures/src/index.ts",
  `export {
  foundationLongRussianFixture,
  foundationReadyFixture,
} from "./foundation-status.fixtures.js";`,
);

write(
  "tests/foundation-status.test.tsx",
  `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationStatus } from "@runtime-human/game-ui";
import {
  foundationLongRussianFixture,
  foundationReadyFixture,
} from "@runtime-human/game-ui-fixtures";

describe("FoundationStatus", () => {
  it("renders a semantic status summary", () => {
    render(<FoundationStatus {...foundationReadyFixture} />);

    expect(screen.getByRole("heading", { name: foundationReadyFixture.title })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Состояние Foundation" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(foundationReadyFixture.checks.length);
    expect(screen.getByText("Готово")).toBeInTheDocument();
    expect(screen.getByText("Запланировано")).toBeInTheDocument();
  });

  it("keeps long Russian copy intact", () => {
    render(<FoundationStatus {...foundationLongRussianFixture} />);

    expect(screen.getByText(foundationLongRussianFixture.summary)).toBeInTheDocument();
    expect(screen.getByText(foundationLongRussianFixture.checks[0].label)).toBeInTheDocument();
  });
});
`,
);
write(
  "scripts/check-boundaries.d.mts",
  `export function validateWorkspace(root: string): string[];`,
);

write(
  "apps/desktop/package.json",
  JSON.stringify(
    {
      name: "@runtime-human/desktop",
      version: "0.0.1",
      private: true,
      type: "module",
      scripts: {
        dev: "vite --host 127.0.0.1 --port 1420",
        build: "vite build",
        preview: "vite preview",
        storybook: "storybook dev -p 6006",
        "storybook:build": "storybook build -o storybook-static",
        tauri: "tauri",
      },
      dependencies: {
        "@runtime-human/game-ui": "workspace:*",
        react: "19.2.7",
        "react-dom": "19.2.7",
      },
      devDependencies: {
        "@runtime-human/game-ui-fixtures": "workspace:*",
        "@storybook/addon-a11y": "10.5.0",
        "@storybook/react-vite": "10.5.0",
        "@tauri-apps/cli": "2.11.4",
        "@types/react": "19.2.17",
        "@types/react-dom": "19.2.3",
        "@vitejs/plugin-react": "6.0.3",
        storybook: "10.5.0",
        vite: "8.1.5",
      },
    },
    null,
    2,
  ),
);
write(
  "apps/desktop/tsconfig.json",
  JSON.stringify(
    {
      files: [],
      references: [
        { path: "./tsconfig.app.json" },
        { path: "./tsconfig.node.json" },
      ],
    },
    null,
    2,
  ),
);
write(
  "apps/desktop/tsconfig.app.json",
  JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        rootDir: "src",
        outDir: ".tsbuild/app",
        tsBuildInfoFile: ".tsbuild/app.tsbuildinfo",
        lib: ["ES2024", "DOM", "DOM.Iterable"],
        jsx: "react-jsx",
        types: ["vite/client"],
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
      references: [
        { path: "../../packages/game-ui" },
        { path: "../../packages/game-ui-fixtures" },
      ],
    },
    null,
    2,
  ),
);
write(
  "apps/desktop/tsconfig.node.json",
  JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        rootDir: ".",
        outDir: ".tsbuild/node",
        tsBuildInfoFile: ".tsbuild/node.tsbuildinfo",
        lib: ["ES2024"],
        types: ["node"],
      },
      include: ["vite.config.ts", ".storybook/**/*.ts"],
    },
    null,
    2,
  ),
);
write(
  "apps/desktop/vite.config.ts",
  `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
});`,
);
write(
  "apps/desktop/index.html",
  `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>Runtime Human</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
);
write(
  "apps/desktop/src/App.tsx",
  `import { FoundationStatus } from "@runtime-human/game-ui";

const checks = [
  { id: "runtime.foundation.workspace.v1", label: "pnpm workspace", state: "ready" },
  { id: "runtime.foundation.ui.v1", label: "React и Storybook", state: "ready" },
  { id: "runtime.foundation.tauri.v1", label: "Tauri shell", state: "ready" },
  { id: "runtime.foundation.gameplay.v1", label: "Игровой месяц", state: "planned" },
] as const;

export function App() {
  return (
    <FoundationStatus
      title="Runtime Human"
      summary="Первый исполняемый scaffold готовит безопасное основание. Игровая симуляция появится только после проверки сборки, границ и восстановления."
      checks={checks}
    />
  );
}`,
);
write(
  "apps/desktop/src/main.tsx",
  `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Runtime Human root element was not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`,
);
write(
  "apps/desktop/src/stories/FoundationStatus.stories.tsx",
  `import type { Meta, StoryObj } from "@storybook/react-vite";

import { FoundationStatus } from "@runtime-human/game-ui";
import {
  foundationLongRussianFixture,
  foundationReadyFixture,
} from "@runtime-human/game-ui-fixtures";

const meta = {
  title: "Foundation/FoundationStatus",
  component: FoundationStatus,
  parameters: { layout: "fullscreen" },
  args: foundationReadyFixture,
} satisfies Meta<typeof FoundationStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Canonical: Story = {};
export const LongRussianText: Story = { args: foundationLongRussianFixture };`,
);
write(
  "apps/desktop/.storybook/main.ts",
  `import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;`,
);
write(
  "apps/desktop/.storybook/preview.ts",
  `import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    controls: { expanded: true },
  },
};

export default preview;`,
);

write(
  "apps/desktop/src-tauri/Cargo.toml",
  `[package]
name = "runtime-human-desktop"
version = "0.0.1"
description = "Runtime Human desktop shell"
edition = "2024"
rust-version = "1.97"
publish = false

[build-dependencies]
tauri-build = "=2.6.3"

[dependencies]
tauri = "=2.11.5"
`,
);
write("apps/desktop/src-tauri/build.rs", "fn main() { tauri_build::build() }");
write(
  "apps/desktop/src-tauri/src/main.rs",
  `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run Runtime Human desktop shell");
}`,
);
write(
  "apps/desktop/src-tauri/tauri.conf.json",
  JSON.stringify(
    {
      $schema: "https://schema.tauri.app/config/2",
      productName: "Runtime Human",
      version: "0.0.1",
      identifier: "com.runtimehuman.desktop",
      build: {
        beforeDevCommand: "pnpm dev",
        devUrl: "http://127.0.0.1:1420",
        beforeBuildCommand: "pnpm build",
        frontendDist: "../dist",
      },
      app: {
        windows: [
          {
            label: "main",
            title: "Runtime Human",
            width: 1100,
            height: 720,
            minWidth: 960,
            minHeight: 640,
            resizable: true,
          },
        ],
        security: {
          csp: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src ipc: http://ipc.localhost",
        },
      },
      bundle: { active: false },
    },
    null,
    2,
  ),
);
write(
  "apps/desktop/src-tauri/capabilities/default.json",
  JSON.stringify(
    {
      identifier: "default",
      description: "Minimal permissions for the main Runtime Human window",
      windows: ["main"],
      permissions: ["core:default"],
    },
    null,
    2,
  ),
);

write(
  ".github/workflows/foundation.yml",
  `name: foundation

on:
  push:
    paths:
      - "package.json"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - "tsconfig*.json"
      - "apps/**"
      - "packages/**"
      - "tests/**"
      - "scripts/check-boundaries.*"
      - "rust-toolchain.toml"
      - ".ox*.json"
      - ".github/workflows/foundation.yml"
  pull_request:
    paths:
      - "package.json"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - "tsconfig*.json"
      - "apps/**"
      - "packages/**"
      - "tests/**"
      - "scripts/check-boundaries.*"
      - "rust-toolchain.toml"
      - ".ox*.json"
      - ".github/workflows/foundation.yml"

permissions:
  contents: read

jobs:
  javascript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: "24"
      - name: Activate pnpm
        run: |
          corepack enable
          corepack prepare pnpm@11.11.0 --activate
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Fast verification
        run: pnpm check:fast
      - name: Type-aware lint
        run: pnpm lint:type-aware
      - name: Build renderer
        run: pnpm build
      - name: Build Storybook
        run: pnpm storybook:build

  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - name: Install Tauri system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install --no-install-recommends -y \\
            build-essential \\
            curl \\
            file \\
            libayatana-appindicator3-dev \\
            librsvg2-dev \\
            libssl-dev \\
            libwebkit2gtk-4.1-dev \\
            libxdo-dev \\
            wget
      - name: Install Rust 1.97.0
        run: |
          rustup toolchain install 1.97.0 --profile minimal --component rustfmt,clippy
          rustup default 1.97.0
      - name: Check Rust formatting
        run: cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
      - name: Check Tauri shell
        run: cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
`,
);

console.log("Foundation scaffold files generated.");
