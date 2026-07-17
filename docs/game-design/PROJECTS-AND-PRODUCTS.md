# Проекты и продукты

Нормативная техническая модель: [Project & Technical Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md).

Связанные решения:

- [ADR-014 — Authoritative Project & Work Package Model](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-013 — Professional Progression & Evidence](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Product statement

Проект — главное место, где программист превращает знания в технический результат, принимает trade-offs и создаёт профессиональную историю.

Проект не является:

- одной шкалой progress;
- списком сотен tickets;
- IDE/coding puzzle;
- бухгалтерской CRM;
- автоматическим источником XP;
- синонимом продукта, компании или open-source community.

## Общая техническая основа

Все виды используют Project Engine:

- personal/pet project;
- school/research project;
- work project;
- freelance contract;
- open-source technical project;
- commercial product technical core;
- company internal/platform project.

Общая модель содержит:

- goals and constraints;
- scope slices and requirements;
- Work Packages;
- technical uncertainty and forecast;
- multidimensional quality;
- technical debt;
- latent/known defects;
- releases and maintenance;
- participant contribution;
- technical project history.

## Extension map

### Product/Market

Владеет:

- users/adoption;
- demand;
- pricing;
- revenue/cost;
- churn;
- competitors;
- market fit.

Получает `ReleaseTechnicalOutcome` от Project Engine и возвращает support/demand signals.

### Open Source

Владеет:

- contributors/maintainers;
- issue/PR community flow;
- governance;
- community health;
- sponsorship/funding;
- forks/ownership transfer.

Не дублирует technical quality/debt/defects/releases.

### Company

Владеет:

- employees/teams;
- payroll/hiring/retention;
- portfolio priorities;
- budgets/tooling/process;
- organizational debt;
- delegation policies at organization level.

Передаёт Project Engine capacity, ownership and constraints.

### Career

Владеет:

- job/role/title;
- salary/promotion;
- stakeholders;
- organizational expectations;
- employment consequences.

Получает contribution/outcome summaries.

### Professional Progression

Получает `ExperienceEpisode` и создаёт mastery/fluency/familiarity/evidence. Project Engine не изменяет skill/grade напрямую.

## Work Package

Минимальная meaningful единица технической работы — `WorkPackage`, а не ticket.

Work Package:

- имеет понятную цель;
- связан с небольшим числом scope slices;
- содержит challenge, uncertainty, quality targets and participant plan;
- занимает часть месяца или несколько месяцев;
- выполняется автоматически между meaningful decisions;
- изменяет project quality/debt/defects/release readiness;
- может создать `ExperienceEpisode`.

Игрок не распределяет ежедневные задачи вручную.

## Основные решения игрока

- определить/cut/defer scope;
- выбрать approach/technology/architecture;
- исследовать uncertainty или начать реализацию;
- запросить mentor/review;
- инвестировать в quality;
- принять/погасить debt;
- fix/workaround/defer defect;
- release/delay/cut/rollback;
- назначить owner и guardrails;
- archive/transfer/sell/abandon project.

Routine implementation, maintenance и support выполняются автоматически по commitments/policies.

## Quality

Качество многомерно. Core dimensions:

- functional correctness;
- usability/experience;
- reliability;
- performance efficiency;
- security/safety;
- maintainability;
- supportability/operability.

Project archetype активирует обычно 3–5 dimensions. Низкая confidence не равна низкому quality.

## Technical debt

Debt моделируется через:

- aggregate pressure для routine debt;
- significant debt records для traceable decisions/constraints;
- future change drag;
- defect/risk amplification;
- maintenance/migration consequences.

Осознанный debt может быть рациональным, но не является positive evidence сам по себе.

## Defects and incidents

Разделяются:

- latent defect risk;
- known defects;
- escaped defects;
- incidents/regressions.

Не каждый bug получает отдельную UI-card. Minor defects агрегируются.

## Releases

Release — immutable technical milestone с:

- scope snapshot;
- quality/confidence;
- known issues;
- accepted debt/risk;
- rollout/support policy;
- technical outcome;
- contribution snapshot.

Product/Open Source/Company используют release outcome, но не переписывают technical history.

## Failure and recovery

Проект может:

- пропустить milestone;
- выпустить rough release;
- попасть в debt spiral;
- столкнуться с incident;
- устареть;
- потерять contributor;
- остановиться;
- быть архивированным, переданным, проданным или закрытым.

Провал проекта обычно создаёт новую историю и recovery path, а не game over.

## Historical evolution

Era capabilities меняют:

- доступные tools/version control/testing/CI;
- distribution channels;
- dependency ecosystems;
- collaboration/review;
- deployment/operations;
- project archetypes and monetization.

SaaS, open-source hosting и modern CI не доступны в эпохах, где они исторически невозможны.

## Required tests

- deterministic Work Package outcome;
- uncertainty/forecast;
- quality/confidence;
- debt drag;
- latent defect materialization;
- partial/full/failure;
- release gate/rollback;
- team outcome vs player contribution;
- delegation;
- Project outcome + ExperienceEpisode atomic commit;
- anti-farming/parallelization;
- historical eligibility;
- migration/compatibility.
