# SD-002 — Project & Technical Work Package Engine

- **Дата:** 2026-07-17
- **Статус:** System-design synthesis; решения становятся каноном через ADR-014 и профильные спецификации
- **Область:** проекты, технические work packages, scope, uncertainty, quality, technical debt, defects, releases, maintenance, team contribution, delegation и интерфейс с Professional Progression

## 1. Executive verdict

Текущая документация правильно запрещает ежедневный микроменеджмент и уже вводит `WorkPackage`, многомерное качество и `ExperienceEpisode`. Однако проектная модель пока недостаточно строга для реализации: не определены authoritative lifecycle, scope/requirements, скрытая неопределённость, forecast ranges, debt carrying cost, latent defects, release gates, maintenance load и ownership между Project/Product/Open Source/Company.

Рекомендуемая модель:

```text
Project intent and constraints
→ scope slices
→ aggregated Work Packages
→ uncertainty discovery and decisions
→ technical outcome
→ quality/debt/defect state
→ immutable release/maintenance history
→ ExperienceEpisode
→ Professional Progression Core
```

Project Engine должен быть самостоятельным Experience Provider, но не god-module:

- владеет техническим состоянием проекта;
- не владеет рынком, выручкой, карьерой, командной кадровой системой или профессиональной прогрессией;
- не моделирует Jira backlog из сотен тикетов;
- не сводит проект к одному progress bar;
- не приписывает персонажу результат команды целиком.

## 2. Исследовательская база

| Источник | Дата | Надёжность | Вывод | Применимость |
|---|---:|---|---|---|
| ISO/IEC 25010:2023, Product quality model | 2023-11 | Очень высокая | Качество программного продукта многомерно и используется на всём lifecycle | Прямо: не использовать единую шкалу quality |
| SEI, Managing Technical Debt in Software Engineering | 2016 | Высокая | Technical debt требует отдельной conceptual model и управления, а не декоративного штрафа | Прямо: significant debt records + aggregate pressure |
| Microsoft Research, SPACE of Developer Productivity | 2021 | Высокая | Производительность нельзя измерять одной activity metric | Прямо: work units не равны ценности/качеству |
| Microsoft Research, EngThrive | 2026 | Высокая | Outcome-oriented metrics должны сочетать speed, ease, quality и wellbeing guardrail | Прямо: delivery не должен доминировать над quality и capacity |
| Google Research, What Improves Developer Productivity at Google? Code Quality | 2022 | Высокая | Code quality, tech debt, tools, goals и communication причинно связаны с продуктивностью | Прямо: debt/quality влияют на будущий throughput |
| Google Cloud DORA | ongoing | Высокая | Delivery performance требует одновременно скорости, стабильности и reliability | Прямо: release outcome многомерный |
| Microsoft Research, Software Development at Microsoft Observed | 2005 | Высокая | Task switching, rationale recovery и cross-code awareness создают существенные потери | Прямо: continuity/context-switching/ownership factors |
| Microsoft Research, Developer Productivity Perceptions | 2014 | Высокая | Developers связывают продуктивность с завершением значимых задач без постоянных interruptions | Прямо: Work Package должен быть заметным завершённым outcome |
| Google Research, Modern Code Review at Google | 2018 | Высокая | Review служит quality, knowledge transfer и maintainability, но требует времени и coordination | Прямо: review — contribution type и quality mechanism |
| NIST SP 800-218 SSDF 1.1 / draft 1.2 | 2022/2025 | Очень высокая | Security practices должны быть встроены в lifecycle, а не добавляться после разработки | Прямо: security как conditional quality requirement и release gate |
| Factorio Friday Facts #327/#241 | 2018/2020 | Средняя–высокая | Игрок должен сначала почувствовать ручную проблему, затем оценить automation; сложность раскрывается постепенно | Прямо: early projects просты, automation/delegation открываются позднее |
| GDC, Management as Game Design | 2012 | Средняя–высокая | Люди не являются взаимозаменяемыми pieces; управление должно учитывать autonomy и ownership | Прямо: делегирование через owner/guardrails, не ручную раскладку часов |

### Основные ссылки

- https://www.iso.org/standard/78176.html
- https://www.sei.cmu.edu/library/managing-technical-debt-in-software-engineering/
- https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/
- https://www.microsoft.com/en-us/research/publication/engthrive-make-it-fast-and-easy-to-do-great-work/
- https://research.google/pubs/what-improves-developer-productivity-at-google-code-quality/
- https://cloud.google.com/developers/dora
- https://www.microsoft.com/en-us/research/publication/software-development-at-microsoft-observed/
- https://www.microsoft.com/en-us/research/publication/software-developers-perceptions-of-productivity/
- https://research.google/pubs/modern-code-review-a-case-study-at-google/
- https://csrc.nist.gov/pubs/sp/800/218/final
- https://factorio.com/blog/post/fff-327
- https://factorio.com/blog/post/fff-241
- https://www.gdcvault.com/play/1016558/Management-as-Game-Design-People

## 3. Главный диагноз текущей модели

### 3.1. `WorkPackage` пока является DTO, а не системой

Определены challenge, requirements, technologies, work units и outcomes, но отсутствуют:

- lifecycle;
- hidden/latent work;
- uncertainty discovery;
- forecast range;
- state transitions после partial/failure;
- dependency/ownership policy;
- release integration.

### 3.2. Качество перечислено, но не операционализировано

Семь dimensions существуют рядом, но не определено:

- какие активны для конкретного project kind;
- target/achieved/confidence;
- как решения изменяют качество;
- как quality gates блокируют release;
- как low confidence отличается от low quality.

### 3.3. Technical debt не имеет carrying cost

Текущий debt — поле проекта и возможный outcome. Без records, affected scope, drag и risk он станет одной полосой «долг 47» и не создаст интересных решений.

### 3.4. Bugs рискуют стать либо шумом, либо случайными event

Необходимо разделить:

- latent defect risk;
- known defects;
- escaped defects;
- incidents;
- fixes and regressions.

Каждый микробаг не должен быть отдельной сущностью/UI-карточкой.

### 3.5. Project и Product смешиваются

Технический проект и рыночный продукт связаны, но различны:

- Project Engine владеет scope, quality, debt, defects, releases;
- Product/Market владеет users, demand, revenue, churn, competition;
- Open Source владеет community/governance;
- Company владеет teams, payroll, portfolio priorities;
- Career владеет job expectations и organizational consequences.

## 4. Рекомендуемая boundary map

```text
Career / Company / Education / Open Source
            │ goals, constraints, capacity, participants
            ▼
Project & Work Package Engine
  ├─ project lifecycle
  ├─ scope and requirements
  ├─ Work Package lifecycle
  ├─ uncertainty and forecast
  ├─ quality/debt/defects
  ├─ contribution and ownership
  ├─ release and maintenance
  └─ technical outcome truth
            │
            ├─ ReleaseTechnicalOutcome → Product/Market
            ├─ ProjectCommunityOutcome → Open Source
            ├─ PortfolioOutcome → Company
            └─ ExperienceEpisode → Progression Core
```

## 5. Project lifecycle

```text
idea
→ discovery
→ active-development
→ released
→ maintenance
→ completed / archived / transferred / sold / abandoned
```

`released` и `maintenance` не обязательно завершают development. Long-lived product может иметь несколько releases и параллельные maintenance packages.

## 6. Work Package как единица игры

Work Package — агрегированный значимый кусок технической работы, который:

- имеет одну понятную цель;
- обычно занимает от части месяца до нескольких месяцев;
- содержит реальный trade-off;
- может открыть uncertainty;
- изменяет project state;
- создаёт максимум несколько важных решений;
- может дать `ExperienceEpisode`.

Work Package не является:

- daily task;
- Jira issue;
- одним методом/файлом;
- произвольной XP activity;
- универсальным action point.

### Baseline kinds

- discovery;
- prototype;
- feature;
- defect-fix;
- refactor;
- migration;
- release-preparation;
- maintenance;
- incident-response;
- research.

## 7. Scope and requirements

Проект хранит:

- goals;
- mandatory constraints;
- committed scope;
- optional scope;
- deferred scope;
- acceptance criteria;
- stakeholder/value tags;
- requirement uncertainty и volatility.

Игрок не редактирует сотни requirements. Blocking scope decisions возникают только когда нужно:

- добавить/убрать существенный scope;
- принять compromise;
- изменить deadline/quality target;
- переопределить architecture/technology;
- отложить часть release.

## 8. Uncertainty and forecast

Work Package хранит:

- known remaining work;
- latent work envelope;
- uncertainty dimensions;
- discovered constraints;
- forecast confidence.

Actual hidden work определяется детерминированно при создании/первом запуске package, но не раскрывается игроку полностью.

UI показывает:

- optimistic;
- likely;
- cautious forecast;
- причины разброса.

Forecast является оценкой знания, а не обещанием.

## 9. Progress model

Глобальная life/commitment система передаёт уже capacity-adjusted `AllocatedWork`.

Project Engine применяет только project-specific factors:

```text
effectiveWork = roundHalfEven(
  allocatedWork
  × capabilityFitBps
  × clarityBps
  × toolchainBps
  × coordinationBps
  × continuityBps
  / 10000^5
)
```

- fatigue/health не умножаются повторно;
- progress уменьшает known work;
- uncertainty discovery может раскрыть latent work;
- debt drag может потребить часть effective work;
- package outcome не определяется только заполнением progress bar.

## 10. Quality model

Core quality dimensions:

- functional correctness;
- usability/experience;
- reliability;
- performance efficiency;
- security/safety;
- maintainability;
- supportability/operability.

Project archetype активирует обычно 3–5 dimensions. Остальные могут быть not-applicable или latent risk.

Каждая active dimension хранит:

- target band;
- assessed band;
- confidence;
- trend;
- last assessment source.

Низкая confidence не равна низкому качеству. Release gate может требовать достаточную confidence, а не только score.

## 11. Technical debt

Используются два слоя:

1. `DebtPressureAggregate` для мелкого routine debt.
2. `TechnicalDebtRecord` для значимого долга.

Significant record хранит:

- category;
- origin decision/outcome;
- affected scope;
- principal work estimate;
- change drag;
- defect/risk amplification;
- visibility/confidence;
- intentional/unintentional flag;
- repayment/mitigation state.

Debt создаёт последствия через:

- дополнительные work units;
- более низкую clarity/continuity;
- повышенный defect risk;
- ограничения release/technology migration;
- maintenance load.

Он не является моральным штрафом: осознанный debt может быть рациональным решением.

## 12. Defects and incidents

Разделяются:

- latent defect risk stock;
- materialized known defect;
- escaped defect;
- production incident;
- regression.

Package добавляет risk points в зависимости от change size, complexity, pressure, quality practices и debt. Материализация использует отдельный deterministic RNG scope.

UI показывает только:

- значимые known defects;
- grouped minor defects;
- incidents;
- critical latent-risk warnings при достаточной confidence.

## 13. Contribution and delegation

Разделяются:

- project/team outcome;
- character direct contribution;
- review contribution;
- architecture/decision contribution;
- mentoring contribution;
- delegated outcome;
- external coincidence.

Delegation policy содержит:

- owner;
- expected outcome;
- quality guardrails;
- autonomy level;
- review cadence;
- escalation threshold.

Micromanagement повышает coordination cost и снижает team autonomy. Полное отсутствие oversight повышает latent risk при слабой команде. Игрок управляет ownership и guardrails, а не часами каждого сотрудника.

## 14. Releases

`ReleaseRecord` immutable и содержит:

- included scope/work packages;
- quality snapshot + confidence;
- known issues;
- debt/risk accepted;
- rollout/support policy;
- technical outcome;
- rollback/incident state;
- player/team contribution snapshot.

Release gate проверяет:

- mandatory acceptance criteria;
- unresolved critical defects;
- required quality/confidence;
- compatibility/dependencies;
- support/rollback readiness;
- era-specific distribution capability.

Игрок может сознательно принять риск, если project context разрешает.

## 15. Maintenance

Maintenance load выводится из:

- project size/complexity;
- debt pressure;
- dependencies/ecosystem change;
- user/support load от Product/Open Source;
- release quality;
- operational requirements.

Routine maintenance агрегируется. Только значимые migration, incident, dependency crisis или debt decision создают blocking package.

## 16. Interface contracts

### Product/Market

Получает `ReleaseTechnicalOutcome`; возвращает adoption, support and demand signals. Revenue не изменяет technical quality.

### Open Source

Получает technical state/release; возвращает issue/contributor/community pressure. Community governance не дублирует project quality.

### Company

Передаёт teams, capacity, priorities, ownership and budgets. Project Engine возвращает delivery/risk/maintenance outcomes.

### Career

Передаёт role expectations, deadline/stakeholder constraints. Получает character contribution and organizational outcome.

### Progression

Получает только `ExperienceEpisode`; не меняет project truth.

## 17. Determinism

RNG forks:

```text
project/{projectId}/package/{packageId}/uncertainty
project/{projectId}/package/{packageId}/defect
project/{projectId}/release/{releaseId}/technical
project/{projectId}/incident/{incidentId}
```

IDs строятся из save/project/package/month/rules version. Input ordering нормализуется stable IDs.

## 18. Persistence

### Authoritative snapshot

- projects;
- scope/requirements;
- active work packages;
- quality state;
- debt aggregates/significant records;
- latent defect aggregates/known defects;
- maintenance state;
- ownership/participant plan.

### Append-only

- releases;
- major scope/architecture decisions;
- incidents;
- project lifecycle milestones;
- significant contribution summaries.

### Rebuildable

- dashboard/health score;
- forecast presentation;
- risk summary;
- portfolio cards;
- release comparison charts.

## 19. Anti-exploit matrix summary

- Tiny-project spam: context/evidence diversity requires meaningful sustained context.
- Work-package splitting: validator/anti-repeat groups related packages.
- Intentional failure farming: no delivery/quality claims; repeated failure learning diminishes.
- Debt farming: debt is cost/risk, not positive evidence by itself.
- Bug farming: defect fix evidence limited by root-cause/context novelty.
- Release spam: release impact and evidence require meaningful scope/change.
- Perfection stalling: opportunity cost, obsolescence, deadline and support pressure.
- Huge-team exploit: coordination/coupling/ownership overhead, not raw headcount bonus.
- Delegation-credit theft: contribution snapshot separates leadership from direct craft.
- Abandon/reset exploit: debt/failure history and portfolio reputation persist.

## 20. Vertical slice recommendation

January 1990:

- one personal text-program project;
- one active quality profile: correctness, usability, maintainability;
- two work packages:
  1. core interaction loop;
  2. input validation/recovery;
- one uncertainty discovery;
- one scope/quality/release decision;
- one known defect or accepted debt path;
- one immutable release;
- one `ExperienceEpisode` based on character contribution.

The player never writes real code. Choices concern approach, scope, validation, help and release risk.

## 21. ADR recommendation

ADR-014 is required because SD-002 changes:

- authoritative ProjectState;
- work-package ownership/lifecycle;
- quality/debt/defect/release state;
- MonthRun provider phases and RNG;
- save schema and compatibility;
- extension boundaries with Product/Open Source/Company;
- project → progression contract.

Exact balance coefficients remain versioned rules, not ADR content.

## 22. Implementation staging

### P0

- IDs/schemas;
- ProjectState;
- WorkPackage state machine;
- deterministic progress/uncertainty;
- quality profile;
- persistence contracts.

### P1 — vertical slice

- one project archetype;
- two packages;
- one release;
- one defect/debt branch;
- one ExperienceEpisode.

### P2

- work/pet/freelance projects;
- debt/defect/maintenance;
- release policies;
- contribution ledger.

### P3

- long-lived products;
- open source extension;
- teams/delegation;
- incidents/migrations.

### P4

- company portfolio;
- strategic technical direction;
- succession/ownership transfer;
- late-career legacy projects.

## 23. Open questions requiring playtest

- ideal package duration and number visible simultaneously;
- how often uncertainty should create blocking decisions;
- number of quality dimensions visible in novice mode;
- whether known debt should be shown as records or grouped themes;
- release cadence by project type;
- acceptable forecast accuracy without removing tension;
- strength of coordination/micromanagement penalties;
- amount of project detail technical players expect before UI feels shallow.
