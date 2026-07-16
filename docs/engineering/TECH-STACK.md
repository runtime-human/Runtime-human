# Технологический стек

## Runtime/application

- Tauri 2;
- React 19;
- TypeScript 6 stable;
- Vite 8 with Rolldown/Oxc;
- Node.js 24 LTS;
- pnpm workspace;
- Rust stable pinned in `rust-toolchain.toml`;
- SQLite.

## UI

- Tailwind CSS 4;
- Radix UI primitives;
- Motion;
- TanStack Router;
- Zustand только для transient UI state;
- Lucide React;
- class-variance-authority, clsx, tailwind-merge.

## Content/core

- TypeBox;
- Ajv + formats;
- jsonc-parser;
- versioned PRNG adapter;
- semver/fflate только при модах/export packages.

## Quality

- Oxfmt;
- Oxlint без type-aware как blocking;
- TypeScript project references;
- Knip;
- Lefthook;
- rustfmt/Clippy/cargo-deny;
- sccache в CI/release;
- cargo-nextest после роста Rust tests.

## Tests

- Vitest;
- Testing Library;
- fast-check;
- Playwright;
- WebdriverIO + Tauri service;
- axe integration.

## Добавляемые по потребности

- TanStack Virtual/Table;
- ECharts;
- dnd-kit;
- Storybook;
- Comlink;
- react-markdown + sanitization;
- Howler.

## Не добавлять baseline

- Electron;
- Redux;
- XState для всей игры;
- backend/auth/database server;
- Docker/Kubernetes;
- full ESLint/Prettier/Biome одновременно с Oxc tools;
- Bun как основной runtime;
- Nx/Turborepo до доказанной необходимости;
- Steamworks.