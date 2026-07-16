# CI/CD

## Workflow jobs

### Fast checks

```text
Oxfmt check
Oxlint
TypeScript project build
content schema/semantic validation
architecture dependency checks
```

### Core

Vitest, fast-check smoke, golden tests и balance smoke simulation.

### UI

Testing Library, Playwright Chromium, screenshots, axe и bundle report.

### Rust

rustfmt, Clippy, Rust tests, cargo-deny и migration integration tests.

### Desktop E2E

WebdriverIO Tauri service на Windows runner для selected branches/release candidates.

### Release

Только tag/manual protected workflow:

- clean checkout;
- full tests;
- Tauri/NSIS build;
- Windows signing;
- Tauri updater signature;
- checksums;
- SBOM/third-party notices;
- release manifest;
- upload artifacts.

## Caching

- pnpm store;
- TypeScript incremental artifacts только при безопасной key strategy;
- Cargo registry/target через sccache;
- Playwright browsers по versioned key.

Cache miss не должен ломать build.

## Security

- GitHub Actions pinned по commit SHA для release-sensitive workflows;
- минимальные `permissions`;
- secrets только в protected environment;
- release keys недоступны PR jobs;
- dependency review и secret scanning;
- artifacts immutable после публикации.

## Branch policy

`main` защищён. Существенные изменения проходят PR. Docs-only PR всё равно проверяет links, Markdown, content IDs/ADR index и отсутствие противоречий.

## Commands

Целевые команды:

```bash
pnpm check:fast
pnpm verify
pnpm verify:release
```

Каждая команда документирует точный набор checks и должна быть воспроизводима локально, кроме signing secrets.