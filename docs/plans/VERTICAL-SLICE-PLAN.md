# Vertical Slice Plan

Нормативные спецификации:

- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md).

## Цель

Создать минимальную играбельную цепочку января 1990:

```text
small personal project
→ two Work Packages
→ uncertainty/quality/release decision
→ technical outcome/release
→ contribution snapshot
→ ExperienceEpisode
→ mastery/fluency/evidence
→ atomic commit/restart
```

Slice проверяет игру, а не только Tauri/save infrastructure.

## Gameplay question

> Интересно ли игроку создать первый маленький программный проект, понять technical trade-off, получить правдоподобный результат и увидеть, чему он научился?

Если игрок запомнил только progress bar/покупку/сохранение, slice невалиден.

## Player flow

1. Создать 12-летнего персонажа.
2. Начать в комнате родителей с background доступа к технике.
3. Получить/увидеть historically valid beginner environment.
4. Выбрать обучение/professional focus.
5. Создать маленький personal text-program project.
6. Увидеть цель, scope и первый Work Package.
7. Сделать свободную покупку при наличии денег.
8. Увидеть pre-month commitments + project forecast range.
9. Нажать `Следующий месяц`.
10. Автоматически пройти school/home commitments.
11. Продвинуть package `core-interaction-loop`.
12. Обнаружить uncertainty/invalid-input problem.
13. Получить meaningful choice: help/fix, cut validation/release risk, investigate next month, simplify scope.
14. Закрыть приложение на blocking decision и восстановить тот же draft/hidden outcome.
15. Resolve first/second package as independent/assisted/partial/failure.
16. Update quality and optional debt/known defect.
17. Decide release/delay/cut where outcome permits.
18. Create immutable `ReleaseRecord` or recovery package.
19. Create contribution snapshot and `ExperienceEpisode`.
20. Progression updates mastery/fluency/familiarity/evidence.
21. Show project/professional monthly report and February next step.
22. Restart and load identical committed result without duplicate package/release/evidence.

## Minimal professional model

### Aptitudes

- Reasoning Aptitude;
- Learning Adaptability.

No dedicated aptitude progression UI in slice.

### Skills

- Problem Solving;
- Programming;
- Debugging;
- Data Modelling;
- Testing & Quality.

### Technology

- one technology family;
- one historically available Tier A/B beginner technology;
- conceptual/operational familiarity;
- no version graph/full transfer matrix.

### Capability bands

- Guided;
- Routine;
- Independent;
- Complex.

## Minimal Project model

### Project

A small personal text program in January 1990.

Project lifecycle used:

```text
idea → active-development → released / maintenance
```

No Product users/revenue/company/OSS extension.

### Scope slices

- core interaction;
- result output;
- optional input validation/recovery.

Normally 2 committed + 1 optional.

### Quality dimensions

Only:

- functional correctness;
- usability/experience;
- maintainability.

Each stores target/assessed/confidence.

### Work Packages

1. `core-interaction-loop`;
2. `input-validation-and-recovery`.

No daily tickets/backlog.

### Uncertainty

One deterministic latent realization:

- invalid/edge input requires more work;
- can also reveal easier-than-expected branch in fixture corpus.

UI shows optimistic/likely/cautious range, not exact hidden work.

### Debt/defect

At most one meaningful branch:

- accepted validation debt/known issue;
- or no debt after fix;
- failure path creates recovery package for February.

No full debt/defect ecosystem.

### Release

One release candidate/record with:

- included scope;
- quality/confidence snapshot;
- known issue/accepted debt;
- technical outcome;
- contribution snapshot.

No market adoption/revenue.

## Choices

- decompose/check input;
- compare with example;
- ask for help;
- simplify scope;
- accept known issue and release;
- delay and investigate;
- release only if gate/policy allows.

Not an IDE/coding puzzle.

## Project → Episode

Project Engine owns:

- package/release outcome;
- quality/debt/defect;
- character contribution.

Then creates one episode with:

- project/package/release source;
- challenge/practice/feedback;
- direct/assisted contribution;
- outcome/quality;
- skills/technology;
- stable context fingerprint.

Partial/failure do not become full delivery.

## First evidence

Claims may include:

- craft;
- autonomy;
- quality or debugging/recovery;
- delivery only for completed/released valid outcome.

No grade award required. Read model shows capability/readiness movement.

## Required technical elements

- pnpm monorepo/TypeScript 7/Vite 8/Oxc;
- Tauri/React/Storybook 10;
- shared kernel IDs/GameDate/Money/WorkUnit/fixed-point;
- TypeBox/Ajv schemas;
- seeded deterministic RNG/Manifest;
- Gregorian calendar;
- Begin/Resume/Recover MonthRun;
- Rust persistence/no SQL execute;
- SQLite 3.51.3+ gate/schema migration/backup smoke;
- JSONC content pack;
- Event/Narrative minimum;
- `CharacterProfessionalState`/episodes/evidence;
- `ProjectState`/two packages/quality/release;
- deterministic package/release/evidence IDs;
- Russian localization;
- Vitest/fast-check/Storybook/Playwright/WebdriverIO.

## Storybook minimum

### Foundation

- shell/date/resources;
- loading/empty/error;
- RU long text;
- keyboard/200%/contrast/reduced motion.

### Programmer

- focus/learning/technology;
- skill capability/mastery vs fluency;
- episode/evidence/readiness;
- professional report.

### Project

- project summary;
- Work Package ready/active/blocked/partial/resolved;
- forecast narrow/wide/changed;
- scope committed/optional/deferred;
- quality target/confidence;
- known issue/debt;
- release ready/blocked/accepted risk;
- contribution independent/assisted.

### MonthRun/recovery

- uncertainty decision;
- release decision;
- suspended run;
- same hidden outcome after restart;
- draft project/episode/evidence;
- recovery/incompatible fingerprint;
- quiet month.

## Content minimum

- one HomeCityProfile, era 1990–1994;
- 3 access backgrounds without permanent bad start;
- 5 early technologies catalogue; one full progression;
- 1 technology family;
- 5 skills;
- 1 project archetype;
- 3 scope slices;
- 2 Work Package templates;
- 1 quality profile;
- 1 bounded latent-work/uncertainty rule;
- 1 debt/known-defect branch;
- 1 release policy;
- 4 professional outcomes;
- evidence reason codes;
- ≤3 learning options;
- 6–10 events, mostly professional/project/access context;
- 3 equipment variants/2 housing states;
- project/professional report templates.

## Decision density

- 2–4 meaningful decisions total;
- minimum 2 programmer/project core;
- maximum 1 life-only blocking;
- ordinary package has ≤1 blocking choice in slice;
- no jargon requirement;
- advanced details on demand.

## Deterministic fixture corpus

- average/low-income/no-home-computer;
- high/low aptitudes;
- independent/assisted;
- partial/failure recovery;
- latent work high/low realization;
- release with/without known issue;
- quiet month;
- duplicate answer/restart.

Every start has reachable programming/project outcome or explicit February access/recovery path.

## Persistence/recovery fixtures

- close before/after latent work revelation;
- close at project/release decision;
- duplicate answer/resume;
- crash after package outcome before episode;
- crash after episode/evidence before commit;
- crash after commit before cleanup;
- duplicate package/release/episode/evidence IDs;
- incompatible project/progression/content fingerprint;
- failed migration/backup restore/Safe Mode/export.

## Acceptance criteria

### Project fantasy

- player explains project goal/current package;
- understands forecast uncertainty;
- quality dimensions visible without one fake score;
- choice changes scope/quality/debt/release meaningfully;
- project not daily ticket clicking;
- release/history/contribution understandable.

### Programmer fantasy

- player explains learning and contribution;
- skill vs technology distinct;
- assistance helps learning but lowers autonomy evidence;
- partial/failure not full delivery;
- next February step clear.

### Determinism/recovery

- same seed/manifest gives same latent work/package/release/episode/evidence IDs and trace;
- reload does not reroll defects/hidden work;
- duplicate commands do not duplicate records;
- Project outcome + professional delta atomic;
- restart round-trip;
- no raw SQL capability.

### UX/accessibility

- novice understands causality without guide;
- expert can inspect quality/confidence/contribution;
- keyboard/a11y/visual/RU long text/200% pass;
- no default backlog/Jira/table overload.

### Verification

- `pnpm verify` after scaffold;
- architecture/docs/research traceability;
- balance fixtures show no access/project/evidence farming or soft lock.

## Not included

- full work/Junior career;
- multiple project archetypes/portfolio;
- Product users/revenue/competition;
- Company teams/payroll;
- OSS community/governance;
- full debt/defect/incident system;
- full grade gates/transfer/specialization;
- evidence/package compaction;
- mods/updater/multiple eras/cities/backend/cloud VRT/Content Studio;
- real IDE/code validation.
