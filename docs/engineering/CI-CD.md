---
title: "CI-CD"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# CI/CD

## Workflow jobs

### Fast checks

```text
Oxfmt check
Oxlint fast rules
TypeScript 7 project build
content schema/semantic validation
architecture dependency checks
```

`check:fast` должен завершаться достаточно быстро для pre-push и локальной агентной итерации.

### Full static verification

```text
Oxlint --type-aware
TypeScript 7 clean project build
Knip
license/dependency policy
```

Type-aware lint не заменяет `tsc -b`.

### Core

Vitest, fast-check smoke, golden tests, Narrative Director tests и balance smoke simulation.

### Storybook

- Storybook build;
- render tests;
- interaction tests через Vitest addon;
- accessibility tests;
- visual baselines в фиксированной среде.

Storybook build/test blocking для PR, затрагивающих `game-ui`, stories, design tokens или content presentation fixtures.

### Browser UI

Testing Library, Playwright Chromium, routes, screenshots, axe и bundle report. Playwright может использовать Storybook stories как источник deterministic screenshot states.

### Rust

rustfmt, Clippy, Rust tests, cargo-deny и migration/backup integration tests.

### Desktop E2E

WebdriverIO Tauri service на Windows runner для selected branches, platform/persistence PR и release candidates.

### Security and supply chain

- dependency review;
- secret scanning/push protection;
- pinned GitHub Actions;
- workflow permission audit;
- SBOM generation;
- artifact attestation/provenance;
- archive/import security tests.

### Release

Только tag/manual protected workflow:

- clean checkout;
- full tests;
- Tauri/NSIS build;
- Windows signing;
- Tauri updater signature;
- dry-run signature verification;
- checksums;
- SBOM/third-party notices;
- provenance/attestation;
- release manifest;
- upload immutable artifacts.

## Caching

- pnpm store;
- TypeScript 7 incremental artifacts только при безопасной key strategy;
- Cargo registry/target через sccache;
- Playwright browsers по versioned key;
- Storybook/VRT cache не является baseline source of truth.

Cache miss не должен ломать build.

## Security

- GitHub Actions pinned по full commit SHA для всех workflows, особенно release-sensitive;
- минимальные `permissions` на job;
- secrets только в protected environment;
- release keys недоступны PR jobs;
- dependency review и secret scanning обязательны;
- artifacts immutable после публикации;
- updater private key имеет offline escrow и documented recovery runbook;
- Storybook/MCP/test builds не получают production signing, updater либо save-directory secrets.

## Branch policy

`main` защищён. Существенные изменения проходят PR. Docs-only PR всё равно проверяет links, Markdown, ADR index, research references и отсутствие противоречий.

Изменения workflows, capabilities, migrations, signing и release policy требуют human review.

## Commands

Целевые команды:

```bash
pnpm check:fast
pnpm verify
pnpm verify:release
```

Рекомендуемый состав:

```text
check:fast
  fmt:check + lint + typecheck + content:check

verify
  check:fast + lint:type-aware + unit/property/story tests + Rust checks

verify:release
  verify + browser E2E + desktop E2E + security + package/release checks
```

Каждая команда документирует точный набор checks и должна быть воспроизводима локально, кроме signing secrets.