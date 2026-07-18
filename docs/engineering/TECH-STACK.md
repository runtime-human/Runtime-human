---
title: "TECH-STACK"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Технологический стек

## Runtime/application

- Tauri 2;
- React 19;
- TypeScript 7 stable, exact pinned;
- Vite 8 with Rolldown/Oxc;
- Node.js 24 LTS;
- pnpm workspace;
- Rust stable pinned in `rust-toolchain.toml`;
- SQLite 3.51.3+ либо версия с подтверждённым backport WAL fix;
- `rusqlite` как preferred authoritative persistence adapter.

## UI

- Tailwind CSS 4;
- Radix UI primitives;
- Motion;
- TanStack Router;
- Zustand только для transient UI state;
- Lucide React;
- class-variance-authority, clsx, tailwind-merge;
- Storybook 10 как обязательный UI/content workshop.

## Content/core

- TypeBox;
- Ajv + formats;
- jsonc-parser;
- versioned PRNG adapter;
- semver/fflate только при mod/export packages;
- integer/fixed-point domain types.

## Quality

- Oxfmt;
- Oxlint fast rules в `check:fast`;
- Oxlint type-aware в `verify` и CI;
- TypeScript 7 project references;
- Knip;
- Lefthook;
- rustfmt/Clippy/cargo-deny;
- sccache в CI/release;
- cargo-nextest после роста Rust tests.

TypeScript 7.0 не предоставляет публичный Compiler API. `@typescript/typescript6` допускается только как локальная compatibility dependency конкретного tooling package и не выполняет production typecheck.

## Tests

- Vitest;
- Testing Library;
- fast-check;
- Storybook + Vitest/a11y addons;
- Playwright;
- WebdriverIO + Tauri service;
- axe integration;
- Rust proptest/fuzz для import/archive surfaces после vertical slice.

## Добавляемые по потребности

- TanStack Virtual/Table;
- ECharts;
- dnd-kit;
- Comlink;
- react-markdown + sanitization;
- Howler;
- StrykerJS для выборочного mutation testing;
- Storybook MCP только в development profile после стабилизации component registry.

## Не добавлять baseline

- Electron;
- Redux;
- XState для всей игры;
- backend/auth/database server;
- Docker/Kubernetes;
- full ESLint/Prettier/Biome одновременно с Oxc tools;
- Bun как основной runtime;
- Nx/Turborepo до доказанной необходимости;
- Steamworks;
- raw SQL из production renderer;
- arbitrary code mods;
- обязательный Chromatic или другой cloud VRT SaaS.