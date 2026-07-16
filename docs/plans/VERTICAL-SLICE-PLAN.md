# Vertical Slice Plan

## Цель

Создать минимальную, но настоящую играбельную цепочку от нового персонажа до сохранённого результата первого месяца января 1990 года.

## Scope

Игрок:

1. создаёт персонажа 12 лет;
2. начинает в комнате родителей;
3. имеет стартовое семейное/финансовое состояние;
4. выбирает одно обучение и одну свободную покупку при наличии денег;
5. нажимает «Следующий месяц»;
6. получает автоматическую школу/домашние обязательства;
7. сталкивается минимум с одним возможным blocking event;
8. закрывает приложение и возобновляет persisted MonthRun;
9. получает отчёт;
10. перезапускает приложение и загружает тот же committed сейв.

## Обязательные технические элементы

- pnpm monorepo;
- TypeScript 7 exact pinned;
- Vite 8/Oxc tooling;
- Tauri shell;
- React routing/design tokens;
- Storybook 10 workshop;
- shared kernel/GameDate/Money/IDs/fixed-point types;
- TypeBox/Ajv schemas;
- deterministic RNG + Determinism Manifest;
- Gregorian calendar;
- Begin/Resume/Recover MonthRun;
- accepted Rust persistence write-boundary;
- explicit Tauri capabilities без SQL execute у main window;
- SQLite 3.51.3+ version gate;
- SQLite schema/migration 001;
- Online Backup API/restore smoke;
- JSONC content pack;
- Event Engine minimum;
- Narrative Director minimum blocking budget;
- Russian localization;
- Vitest/fast-check;
- Storybook render/interaction/a11y tests;
- Playwright browser/visual test;
- WebdriverIO Tauri critical smoke.

## Storybook minimum

- application shell;
- date/resource bar;
- character summary;
- activity card;
- event card;
- blocking decision dialog;
- monthly report;
- save/recovery panel;
- loading/empty/error;
- long Russian text;
- keyboard focus;
- 200% text scale;
- high contrast и reduced motion.

## Content minimum

- один HomeCityProfile и era 1990–1994;
- 3 семейных стартовых background;
- 5 технологий ранней эпохи;
- 3 учебные активности;
- 6–10 событий;
- 3 варианта стартовой техники;
- 2 housing states;
- monthly report templates.

## Persistence/recovery scenarios

Обязательны fixtures/tests:

- app close на blocking decision;
- повторная отправка того же decision;
- crash до month commit;
- повторный запуск после commit до draft cleanup;
- incompatible content fingerprint;
- failed migration;
- backup restore;
- Safe Mode open/export.

## Acceptance criteria

- одинаковый seed/manifest даёт одинаковый месяц и trace hash;
- закрытие на blocking event безопасно;
- основной сейв не содержит half-applied month;
- duplicate decision/commit не применяет эффекты дважды;
- money/fixed-point round trip точный;
- save загружается после restart;
- SQLite version/pragmas проверены;
- keyboard-only flow проходит;
- canonical Storybook stories и a11y checks проходят;
- visual baseline воспроизводим в CI;
- no raw SQL execute capability у renderer;
- WebdriverIO проходит create → suspend → restart → resume → commit → reload;
- `pnpm verify` проходит;
- architecture/docs/research traceability соответствуют реализации.

## Не входит

- полноценная работа/Junior career;
- компания;
- open source community;
- пользовательские моды;
- updater release channel;
- несколько эпох;
- второй город/страна;
- backend;
- обязательный cloud VRT;
- Content Studio.