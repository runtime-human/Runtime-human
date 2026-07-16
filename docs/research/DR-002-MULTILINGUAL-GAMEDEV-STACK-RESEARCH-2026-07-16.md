# DR-002 — Многоязычное исследование gamedev и desktop-практик

- **Дата:** 2026-07-16
- **Тип:** Deep Research
- **Статус:** нормализован и учтён
- **Языки источников:** английский, русский, японский и другие доступные локализации документации
- **Область:** игровые симуляции, Tauri/Rust/SQLite desktop-приложения, data-driven content, UI tooling, тестирование, моды, CI/CD и AI-agent workflow

## 1. Методика

Источники были разделены на четыре уровня:

1. **Официальная документация:** Tauri, SQLite, TypeScript, Oxc, Storybook, Playwright, Vitest, WebdriverIO, GitHub и SLSA.
2. **Практические инженерные статьи:** Habr, DEV Community, Qiita, Zenn и технические разборы реальных Tauri-продуктов.
3. **Gamedev-практики:** Gaffer on Games, GameDev Stack Exchange, GDC, Factorio и mod.io.
4. **Community signals:** Hacker News и форумы для выявления повторяющихся failure modes.

Форумное мнение не использовалось как единственное доказательство. Спорные выводы перепроверялись по первичным документам.

## 2. Главный вывод

Runtime Human по инженерному профилю ближе к **local-first simulation platform / data-heavy desktop app**, чем к классической real-time игре. Поэтому проекту нужны одновременно:

- gamedev-практики детерминированной симуляции, replay и data-driven content;
- desktop-практики безопасного IPC, persistence, migrations, updater и native E2E;
- frontend-практики component-driven UI и visual regression;
- строгий content pipeline для тысяч событий и исторических объектов.

Стек менять не требуется. Требуется усилить границы и operational precision.

## 3. Что подтверждено по стеку

### Tauri 2

Сильные стороны:

- небольшой дистрибутив;
- низкое потребление памяти относительно bundled Chromium shell;
- узкий Rust perimeter;
- capability/permission model;
- удобный standalone updater.

Риск: системный WebView2 — реальная platform dependency. Windows становится единственной tier-1 платформой до появления отдельных CI и visual baselines для macOS/Linux.

### React 19 + Vite 8

Подходят для state-heavy UI и быстрого изолированного frontend workflow. Vite 8/Rolldown сокращает build time и сохраняет совместимость с современной экосистемой.

### TypeScript 7

Стабильный native compiler даёт значительное ускорение full builds и language service. Для React/Vite проекта переход оправдан. Ограничение TS7.0: отсутствие публичного Compiler API; tooling, которому он нужен, должно использовать документированную compatibility-схему, а не удерживать весь проект на TS6.

### Oxlint/Oxfmt

Подтверждены как быстрый основной lint/format stack. Рекомендуемый pipeline:

```text
pre-commit: Oxfmt + fast Oxlint on changed files
pre-push: tsc -b + unit tests
CI verify: Oxfmt check + Oxlint + Oxlint type-aware + tsc -b + tests
```

### Storybook 10

Storybook рассматривается как UI/content workshop, а не документация «на потом». Особенно ценны:

- CSF stories как fixtures;
- play-функции и interaction tests;
- Vitest addon;
- accessibility addon;
- visual baselines;
- isolated mocks;
- поддержка AI-agent component discovery через Storybook MCP.

Обязательный внешний Chromatic не принимается: проект остаётся offline-first и бесплатным. Visual regression строится на стабильной локальной/CI среде с Playwright или self-controlled runner.

## 4. Практические аналоги и уроки

### Beetroot / Habr

Tauri 2 + React 19 + Rust + SQLite показывает жизнеспособность для UI-heavy desktop utility. Полезные уроки:

- security boundary должен проектироваться до UI;
- Rust используется для чувствительных операций;
- event-driven коммуникация лучше общего доступа к platform APIs;
- размер дистрибутива и startup важны как продуктовые метрики.

### SmoothCSV / DEV

Полезен как пример package extraction и command-centric architecture:

- core logic выносится из UI;
- команды узкие и типизированные;
- тяжёлые data operations не смешиваются с renderer;
- monorepo package boundaries полезны раньше микросервисов.

### Tabularis / DEV

Подтверждает provider/trait-based адаптеры и Rust data plane. Для Runtime Human применимо как typed ports/repositories, но не как перенос Game Core в Rust.

### Yttri и другие Habr-разборы

Подтверждают необходимость явных Tauri capabilities, минимальных разрешений и ограничения native surface.

### Habr/Okko и Zenn по Storybook/VRT

Повторяющийся вывод: Storybook и visual regression дают наибольшую отдачу, когда вводятся до разрастания component states. Для Runtime Human это особенно важно из-за длинных текстов, событийных карточек и большого числа редких состояний.

### Gaffer on Games и GameDev.SE

Полезны не fixed timestep как таковой, а общие принципы:

- deterministic input processing;
- checkpoints;
- input/decision log;
- snapshots для resume;
- trace/hash для поиска расхождений;
- воспроизводимые seeds.

Месячная turn-based модель не нуждается в real-time accumulator, но нуждается в тех же гарантиях replay и state transition.

### Factorio и mod.io

Главный урок — зрелый lifecycle модов:

- manifest и version;
- dependency graph;
- compatibility range;
- stable namespaced IDs;
- migrations;
- tombstones/remaps;
- checksums;
- quarantine;
- запрет доверять архиву и путям внутри него.

## 5. Архитектурные решения по результатам

### 5.1. Tauri capabilities

Не используется одна широкая capability. Разрешения делятся минимум на:

- main user window;
- import/export flow;
- updater;
- debug/read-only tooling;
- desktop test build.

Production main window не получает SQL execute, произвольный filesystem и shell access.

### 5.2. Persistence

```text
React UI
→ typed application facade
→ typed Tauri commands
→ Rust persistence services
→ SQLite single writer
```

Raw SQL не пересекает UI boundary.

### 5.3. MonthRun

Хранятся таблицы/проекции для run, steps, decisions, checkpoints и trace. Конкретная физическая схема может быть упрощена до одного draft blob плюс нормализованный индекс, но логическая модель обязана сохранять все перечисленные данные.

### 5.4. Save durability

- backup перед migration/update;
- restore в новый файл, не поверх единственной копии;
- checksum и integrity verification;
- startup recovery marker;
- Safe Mode;
- downgrade не открывает новый schema как writable;
- backup retention policy.

### 5.5. Testing matrix

| Слой | Инструмент | Назначение |
|---|---|---|
| Rust | cargo test/proptest/fuzz | repositories, parsers, archives |
| TS core | Vitest + fast-check | formulas, invariants, deterministic runs |
| Components | Storybook + Vitest addon | isolated render/interactions/a11y |
| Browser app | Playwright | routes, renderer flows, VRT |
| Desktop | WebdriverIO Tauri | executable, IPC, SQLite, lifecycle |
| Balance | batch simulator | long-run distributions и soft locks |

### 5.6. Supply chain

- actions pinned by commit SHA;
- workflow permissions deny-by-default;
- lockfiles reviewed;
- cargo-deny/JS license checks;
- dependency review required;
- secret scanning;
- SBOM и provenance;
- signing secrets только в protected release environment;
- release artifacts immutable.

### 5.7. AI-agent workflow

- `AGENTS.md` остаётся коротким глобальным контрактом;
- path-specific instructions добавляются рядом с чувствительными модулями;
- issue, web page, mod, log и third-party README считаются untrusted data;
- agents не получают release keys;
- migrations, capabilities, workflows и signing требуют human review;
- completion report содержит фактические commands/results;
- stories и deterministic fixtures используются как машинно проверяемый feedback.

## 6. Приоритеты

### P0 — до production-кода

1. Rust persistence write-boundary.
2. Persisted MonthRun suspend/resume.
3. Integer-only domain numerics.
4. Determinism Manifest.
5. SQLite version gate и runbook.
6. TypeScript 7 baseline.
7. Storybook в Foundation.
8. Explicit Tauri capabilities.

### P1 — до vertical slice exit

1. WebdriverIO desktop lane.
2. Backup/migration/recovery corpus.
3. Storybook interaction/a11y coverage ключевых компонентов.
4. Mod/content manifest policy.
5. CI supply-chain checks.
6. Windows tier-1 test matrix.
7. Local diagnostics/redaction policy.

### P2 — после vertical slice

1. Content Studio поверх тех же schemas/fixtures.
2. Mutation testing критических pure modules.
3. Fuzzing archive/import surfaces.
4. Отдельный offline WebView2 installer при подтверждённом спросе.
5. Storybook MCP после стабилизации permissions и component registry.

## 7. Что оставить без изменений

- Tauri 2, React 19, Vite 8, Tailwind 4 и Radix;
- pure TypeScript Game Core;
- SQLite local-first storage;
- один фиксированный вымышленный город;
- реальный календарь и историческая шкала;
- отсутствие Steam, stores, backend и cloud save baseline;
- JSONC + TypeBox + Ajv;
- data-only mods;
- Zustand только для transient UI;
- Narrative Director как отдельный модуль;
- full snapshot + history, а не full event sourcing.

## 8. Что отклонено

- Electron;
- перенос всего core в Rust;
- raw SQL из production renderer;
- float-authoritative simulation;
- только browser E2E;
- code-executing mods;
- обязательный Chromatic/SaaS;
- backend ради telemetry;
- Nx/Turborepo без измеренной необходимости;
- страны/визовая система/региональная экономика.

## 9. Основные источники

### Official

- https://v2.tauri.app/concept/architecture/
- https://v2.tauri.app/security/capabilities/
- https://v2.tauri.app/learn/security/using-plugin-permissions/
- https://v2.tauri.app/plugin/sql/
- https://v2.tauri.app/plugin/updater/
- https://v2.tauri.app/distribute/windows-installer/
- https://react.dev/versions
- https://vite.dev/blog/announcing-vite8
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://oxc.rs/docs/guide/usage/linter/type-aware.html
- https://storybook.js.org/
- https://storybook.js.org/docs/writing-tests/interaction-testing
- https://storybook.js.org/docs/writing-tests/accessibility-testing
- https://storybook.js.org/docs/writing-tests/visual-testing
- https://playwright.dev/docs/best-practices
- https://vitest.dev/guide/comparisons
- https://webdriver.io/docs/desktop-testing/tauri/
- https://sqlite.org/wal.html
- https://sqlite.org/backup.html
- https://sqlite.org/lang_vacuum.html
- https://sqlite.org/lang_analyze.html
- https://docs.github.com/en/actions/reference/security/secure-use
- https://slsa.dev/

### Articles and practice

- https://habr.com/ru/articles/1008770/
- https://habr.com/ru/articles/996446/
- https://habr.com/ru/companies/okko/articles/890438/
- https://dev.to/kohii/the-technology-behind-smoothcsv-the-ultimate-csv-editor-3lg0
- https://dev.to/debba/building-tabularis-a-developers-database-tool-that-doesnt-suck-4k73
- https://zenn.dev/rehabforjapan/articles/vrt-with-playwrigyt-storybook
- https://qiita.com/studio_haneya/items/e1b2a770e9f57115dd96

### Gamedev and community

- https://gafferongames.com/post/fix_your_timestep/
- https://gafferongames.com/post/deterministic_lockstep/
- https://gafferongames.com/post/floating_point_determinism/
- https://gamedev.stackexchange.com/questions/6080/how-to-design-a-replay-system
- https://gamedev.stackexchange.com/questions/45997/what-data-type-should-i-use-for-in-game-currency
- https://docs.mod.io/unreal/ugc-best-practices
- https://wiki.factorio.com/Tutorial:Modding_tutorial/Gangsir
- https://news.ycombinator.com/item?id=44118023
- https://news.ycombinator.com/item?id=47235430
