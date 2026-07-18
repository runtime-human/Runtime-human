---
title: "Технические источники"
type: source
status: draft
canon: false
updated: 2026-07-18
---

# Технические источники

> Проверять актуальную документацию перед изменением версии или API. Этот список задаёт приоритет официальных источников, а не заменяет exact version pinning в репозитории.

## Deep Research

- [DR-001 — аудит стека и архитектуры](../research/DR-001-STACK-ARCHITECTURE-AUDIT-2026-07-16.md)
- [DR-002 — многоязычное исследование](../research/DR-002-MULTILINGUAL-GAMEDEV-STACK-RESEARCH-2026-07-16.md)
- [Синтез и матрица решений](../research/DR-SYNTHESIS-2026-07-16.md)

## Desktop

- Tauri 2 documentation: https://v2.tauri.app/
- Tauri architecture: https://v2.tauri.app/concept/architecture/
- Tauri security/capabilities: https://v2.tauri.app/security/capabilities/
- Tauri plugin permissions: https://v2.tauri.app/learn/security/using-plugin-permissions/
- Tauri SQL plugin: https://v2.tauri.app/plugin/sql/
- Tauri updater: https://v2.tauri.app/plugin/updater/
- Tauri Windows installer: https://v2.tauri.app/distribute/windows-installer/
- WebView2 documentation: https://learn.microsoft.com/en-us/microsoft-edge/webview2/

## Frontend/tooling

- React: https://react.dev/
- TypeScript 7 release: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- TypeScript docs: https://www.typescriptlang.org/docs/
- Vite 8: https://vite.dev/blog/announcing-vite8
- pnpm: https://pnpm.io/
- Tailwind CSS: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/primitives/docs/overview/introduction
- TanStack Router: https://tanstack.com/router/latest
- Zustand: https://zustand.docs.pmnd.rs/
- Motion: https://motion.dev/docs/react

## Storybook

- Storybook: https://storybook.js.org/
- Why Storybook: https://storybook.js.org/docs/10.5/get-started/why-storybook
- Interaction tests: https://storybook.js.org/docs/writing-tests/interaction-testing
- Accessibility tests: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Visual tests: https://storybook.js.org/docs/writing-tests/visual-testing
- Storybook 10.3/MCP: https://storybook.js.org/blog/storybook-10-3/

## Oxc and quality

- Oxc/Oxlint/Oxfmt: https://oxc.rs/docs/
- Oxlint type-aware: https://oxc.rs/docs/guide/usage/linter/type-aware.html
- Knip: https://knip.dev/
- Lefthook: https://github.com/evilmartians/lefthook
- Vitest: https://vitest.dev/
- fast-check: https://fast-check.dev/
- Playwright: https://playwright.dev/
- WebdriverIO Tauri: https://webdriver.io/docs/desktop-testing/tauri/
- WebdriverIO Tauri service: https://webdriver.io/docs/wdio-tauri-service/

## Schemas/content

- TypeBox: https://github.com/sinclairzx81/typebox
- Ajv: https://ajv.js.org/
- JSON Schema: https://json-schema.org/
- i18next: https://www.i18next.com/
- mod.io UGC practices: https://docs.mod.io/unreal/ugc-best-practices
- Factorio modding references: https://wiki.factorio.com/Tutorials

## Persistence

- SQLite: https://sqlite.org/docs.html
- WAL: https://sqlite.org/wal.html
- Online Backup API: https://sqlite.org/backup.html
- VACUUM/VACUUM INTO: https://sqlite.org/lang_vacuum.html
- Pragmas: https://sqlite.org/pragma.html
- Query planning/ANALYZE/optimize: https://sqlite.org/lang_analyze.html
- rusqlite: https://docs.rs/rusqlite/latest/rusqlite/

## Deterministic simulation

- Fixed timestep principles: https://gafferongames.com/post/fix_your_timestep/
- Deterministic lockstep: https://gafferongames.com/post/deterministic_lockstep/
- Floating-point determinism: https://gafferongames.com/post/floating_point_determinism/
- Replay system discussion: https://gamedev.stackexchange.com/questions/6080/how-to-design-a-replay-system

## Rust

- Rust: https://doc.rust-lang.org/
- Cargo: https://doc.rust-lang.org/cargo/
- cargo-deny: https://embarkstudios.github.io/cargo-deny/
- cargo-nextest: https://nexte.st/
- sccache: https://github.com/mozilla/sccache

## Supply chain and agents

- GitHub Actions secure use: https://docs.github.com/en/actions/reference/security/secure-use
- Dependency review: https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customize-dependency-review-action
- Secret scanning: https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning
- SLSA: https://slsa.dev/
- Agent tool design: https://www.anthropic.com/engineering/writing-tools-for-agents
- Trustworthy agents: https://www.anthropic.com/research/trustworthy-agents

## Вторичные практические источники

- Habr Beetroot/Tauri case: https://habr.com/ru/articles/1008770/
- Habr Tauri case: https://habr.com/ru/articles/996446/
- Habr Storybook/VRT: https://habr.com/ru/companies/okko/articles/890438/
- SmoothCSV architecture: https://dev.to/kohii/the-technology-behind-smoothcsv-the-ultimate-csv-editor-3lg0
- Tabularis architecture: https://dev.to/debba/building-tabularis-a-developers-database-tool-that-doesnt-suck-4k73
- Zenn Storybook VRT: https://zenn.dev/rehabforjapan/articles/vrt-with-playwrigyt-storybook
- Qiita Tauri architecture: https://qiita.com/studio_haneya/items/e1b2a770e9f57115dd96

## Правило использования

Технический ADR должен ссылаться на официальную документацию конкретной версии либо на source repository/release notes. Blog/review/forum используется как вторичный контекст, источник повторяющихся failure modes и практическое подтверждение, но не как единственное основание решения.