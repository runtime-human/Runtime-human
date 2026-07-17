# Vertical Slice Plan

Нормативная продуктовая иерархия: [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md).

## Цель

Создать минимальную, но настоящую играбельную цепочку от нового персонажа до сохранённого результата первого месяца января 1990 года.

Vertical slice должен проверить не только инфраструктуру MonthRun/save/recovery, но и центральную фантазию: игрок начинает становиться программистом, решает первую техническую проблему, получает понятное evidence и видит следующий профессиональный шаг.

## Gameplay question

Slice обязан ответить:

> Интересно ли игроку прожить первый месяц будущего программиста, даже если убрать ценность технического proof-of-concept?

Если после прохождения игрок помнит только комнату, покупку, семейное событие и корректное сохранение, но не помнит, чему научился и что создал/исправил, slice не прошёл gameplay validation.

## Scope

Игрок:

1. создаёт персонажа 12 лет;
2. начинает в комнате родителей;
3. имеет стартовое семейное/финансовое состояние и один из backgrounds доступа к технике;
4. видит historically appropriate beginner technology или путь получить к ней доступ;
5. выбирает одно обучение;
6. запускает первую hands-on programming activity;
7. принимает одну свободную покупку при наличии денег;
8. видит pre-month forecast: school/home commitments, learning, equipment limits и ожидаемый technical outcome;
9. нажимает «Следующий месяц»;
10. получает автоматическую школу/домашние обязательства;
11. сталкивается с первой технической неопределённостью, ошибкой или задачей problem decomposition;
12. при необходимости получает минимум один possible blocking event;
13. закрывает приложение и возобновляет persisted MonthRun;
14. получает частичный или завершённый programming result;
15. получает рост core skill и technology proficiency;
16. получает сохранённый `ProfessionalEvidence`;
17. видит grade-readiness/capability explanation;
18. получает новый профессиональный вариант на февраль;
19. перезапускает приложение и загружает тот же committed сейв.

## Programmer-core minimum

### Beginner technology

- одна исторически доступная programming environment/technology из content pack;
- lifecycle stage и local availability соответствуют январю 1990;
- технология относится к Tier A либо Tier B;
- UI объясняет её человеческим языком.

### Hands-on activity

Активность должна включать:

- понятную цель;
- небольшую техническую неопределённость;
- минимум один выбор approach;
- возможность частичного результата;
- один failure/recovery path;
- skill/technology gain;
- ProfessionalEvidence output.

Она не превращается в полноценный IDE или coding puzzle. Выборы могут быть представлены как:

- разбить задачу на части;
- прочитать пример;
- попросить помощь;
- проверить ввод/условия;
- переписать непонятный фрагмент;
- потратить больше времени на понимание;
- оставить imperfect result и продолжить позже.

### First evidence

`ProfessionalEvidence` фиксирует:

- activity/source ID;
- skill family;
- technology family;
- task difficulty;
- novelty;
- autonomy/assistance;
- outcome quality;
- completion/partial state;
- date range.

Slice не требует полноценной grade promotion, но read model должен показать capability change.

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
- Narrative Director minimum blocking/programmer-first budgets;
- ProfessionalEvidence schema/read model;
- minimum skill/technology progression;
- Russian localization;
- Vitest/fast-check;
- Storybook render/interaction/a11y tests;
- Playwright browser/visual test;
- WebdriverIO Tauri critical smoke.

## Storybook minimum

### Foundation

- application shell;
- date/resource bar;
- loading/empty/error;
- long Russian text;
- keyboard focus;
- 200% text scale;
- high contrast и reduced motion.

### Programmer core

- professional focus card;
- learning activity card;
- beginner technology card;
- technical problem/trade-off card;
- skill capability summary;
- first ProfessionalEvidence;
- grade-readiness explanation;
- pre-month forecast;
- monthly report programmer-first.

### MonthRun/recovery

- event card;
- blocking decision dialog;
- suspended MonthRun;
- save/recovery panel;
- quiet-month report fixture.

## Content minimum

- один HomeCityProfile и era 1990–1994;
- 3 семейных стартовых background, различающихся доступом, но не создающих permanent bad start;
- 5 технологий ранней эпохи с Tier/lifecycle/transfer definitions;
- 3 учебные активности;
- минимум 1 hands-on programming activity с failure/recovery;
- минимум 1 technical problem/decomposition event;
- 6–10 событий, из которых большинство связано с learning/technology/equipment/school professional context;
- 3 варианта стартовой техники;
- 2 housing states;
- first ProfessionalEvidence fixture;
- programmer-first monthly report templates.

## Decision-density targets для slice

- 2–4 meaningful decisions до/внутри первого MonthRun;
- минимум 2 programmer-core decisions;
- максимум 1 life-only blocking decision;
- минимум 1 quiet/non-blocking technical observation;
- ни одно решение не требует знания профессионального жаргона;
- advanced explanation доступно по запросу.

## Persistence/recovery scenarios

Обязательны fixtures/tests:

- app close на technical blocking decision;
- app close на life blocking decision;
- повторная отправка того же decision;
- crash до ProfessionalEvidence creation;
- crash после evidence draft, но до month commit;
- повторный запуск после commit до draft cleanup;
- incompatible content fingerprint;
- failed migration;
- backup restore;
- Safe Mode open/export.

## Balance fixtures

Минимальный deterministic corpus:

- average access/background;
- low-income/no-home-computer start;
- strong family support;
- high learning adaptability;
- weak self-organization;
- failure-first technical outcome;
- no blocking event quiet month.

Каждый corpus run должен иметь reachable programmer outcome либо явно объяснимый путь получить доступ в феврале. Low-income background не должен создавать soft lock.

## Acceptance criteria

### Programmer fantasy

- игрок может объяснить, чему персонаж научился;
- skill и technology различимы;
- technical choice имеет понятное последствие;
- ProfessionalEvidence создаётся только из task context;
- capability/grade-readiness explanation соответствует evidence;
- на февраль открывается понятный следующий профессиональный шаг;
- monthly report начинается с programmer development;
- финансовые и бытовые показатели не доминируют визуально.

### Determinism and recovery

- одинаковый seed/manifest даёт одинаковый месяц и trace hash;
- закрытие на blocking event безопасно;
- основной сейв не содержит half-applied month;
- duplicate decision/commit не применяет effects/evidence дважды;
- money/fixed-point round trip точный;
- save загружается после restart;
- SQLite version/pragmas проверены;
- no raw SQL execute capability у renderer;
- WebdriverIO проходит create → learn → suspend → restart → resume → evidence → commit → reload.

### UX/accessibility

- keyboard-only flow проходит;
- canonical Storybook stories и a11y checks проходят;
- visual baseline воспроизводим в CI;
- пользователь без опыта понимает цель и причинность без внешнего справочника;
- опытный разработчик находит advanced evidence/skill detail;
- long Russian text и 200% scale не ломают ключевой flow.

### Verification

- `pnpm verify` проходит;
- architecture/docs/research traceability соответствуют реализации;
- balance fixtures не показывают programmer arc starvation или стартовый soft lock.

## Не входит

- полноценная работа/Junior career;
- полноценная project/product system;
- компания;
- open-source community;
- пользовательские моды;
- updater release channel;
- несколько эпох;
- второй город/страна;
- backend;
- обязательный cloud VRT;
- Content Studio;
- реалистичный IDE или проверка написанного пользователем кода.
