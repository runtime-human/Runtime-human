# Навыки и технологии

Нормативные спецификации:

- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md)
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md)
- [Technology Ecosystem Engine](TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md)
- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)

## Разделение понятий

- **Aptitude** — узкая медленно меняющаяся предрасположенность.
- **Skill** — переносимая профессиональная способность.
- **Facet** — task-specific детализация без отдельной progression bar.
- **Capability** — human-readable derived утверждение о доказанной способности.
- **Technology** — язык/runtime/framework/platform/tool с gameplay-значимой identity.
- **Technology family** — группа transfer и общих mechanics.
- **Version band** — крупная compatibility/ecosystem/support линия, не каждая версия.
- **Platform/toolchain context** — среда, необходимая для практического использования.
- **Ecosystem context** — affordances и risks вокруг технологии.
- **Familiarity** — текущая способность персонажа работать с конкретной technology/band.
- **Specialization** — derived профиль практики/evidence.
- **Professional Evidence** — подтверждённое применение capability в контексте.

Docker не является языком, C# не является специализацией, Programming не является одной technology, а популярность не является proficiency.

## Ownership

- Historical Technology Catalog владеет global chronology, bands, prerequisites, compatibility и support facts.
- City/Era content владеет fictional local diffusion.
- Equipment/School/NPC/Economy/Employment владеют practical access.
- Technology Context Engine создаёт immutable provider context.
- Learning/Project/Career владеют своими outcomes.
- Progression владеет familiarity, transfer, evidence и grade.

TechnologyDefinition или ecosystem profile не меняют professional state напрямую.

## Baseline skill graph

### Tier 1 — всегда видимы

| ID | Название | Что моделирует |
|---|---|---|
| `skill.problem-solving` | Problem Solving | Декомпозиция, алгоритмический подход и technical research |
| `skill.programming` | Programming | Реализация понятого решения |
| `skill.debugging` | Debugging | Code reading, поиск причины и проверка исправления |
| `skill.data-modelling` | Data Modelling | Представление сущностей, данных и состояния |
| `skill.testing-quality` | Testing & Quality | Проверка результата и предотвращение regressions |
| `skill.codebase-evolution` | Codebase Evolution | Refactoring, legacy и безопасные изменения |

### Tier 2 — progressive disclosure

| ID | Название | Что моделирует |
|---|---|---|
| `skill.requirements-design` | Requirements & Design | Уточнение проблемы и проектирование решения |
| `skill.architecture` | Architecture | Системные границы и trade-offs |
| `skill.delivery-operations` | Delivery & Operations | VCS, build, release, deployment и observability |
| `skill.non-functional` | Non-functional Engineering | Performance, reliability и security |
| `skill.technical-communication` | Technical Communication | Документация, объяснение и согласование |
| `skill.review-leadership` | Review, Mentoring & Leadership | Review, mentoring и technical direction |
| `skill.community-stewardship` | Community Stewardship | Governance и здоровье open-source community |

## Facets вместо десятков шкал

Обычно facets/task tags:

- Algorithmic Reasoning;
- Systems Thinking;
- Computational Constraints;
- Code Reading;
- Version Control;
- Documentation;
- Development Tools;
- Performance/Reliability/Security;
- Incident Handling;
- Legacy Modernization;
- Planning/Estimation;
- Release Management;
- Public Speaking/Technical Writing;
- Hiring/Delegation;
- Product Discovery/Marketing/Sales.

Facet становится skill только если регулярно создаёт самостоятельные decisions, имеет независимые providers/evidence, нужен нескольким paths и оправдывает content/UX cost.

## Skill progress

Authoritative:

- mastery;
- fluency;
- last practice;
- strongest demonstrated capability band.

Normal UI показывает capability text и broad level. Advanced может показывать mastery/fluency/evidence. Общего XP, определяющего grade, нет.

## Learning и evidence

Mastery зависит от challenge match, novelty, feedback, reflection, capacity и diminishing returns. Fluency зависит от текущей практики и reacquisition. Evidence зависит от demonstrated challenge, completion, quality, autonomy, confidence, context novelty и anti-repeat.

Provider создаёт `ExperienceEpisode`; Progression возвращает skill/technology deltas, evidence claims, monthly aggregate и explanations.

Курс/источник может дать learning, но production evidence требует project/work/open-source context. Assistance может повысить learning и снизить autonomy evidence.

## Technology identity and tiers

Technology categories:

- language;
- runtime;
- framework;
- database;
- operating system/platform;
- toolchain/development/delivery tool;
- standard;
- assistant.

### Tier A

Уникальные meaningful lifecycle/decisions, familiarity, bands and fixtures.

### Tier B

Identity с общей family mechanics и ограниченным unique content/state.

### Tier C

Context/tag/requirement без отдельной proficiency bar. Библиотеки/packages/tools по умолчанию Tier C.

Tier повышается только при доказанном current gameplay.

## Technology definition

Содержит:

- stable ID/family/category/tier;
- historical identity/source refs;
- paradigms/facets;
- prerequisites;
- meaningful version bands;
- compatible project kinds;
- platform/toolchain/ecosystem profile refs;
- transfer context;
- UI/localization metadata.

Historical chronology, local availability, practical access, market demand and character familiarity хранятся/проецируются отдельными владельцами.

## Multi-axis lifecycle

### Release maturity

`preview → experimental → available → established`

### Adoption/demand

`niche → emerging → growing → mainstream → concentrated/declining`

### Support

`active → maintenance → security-only → unsupported`

### Ecosystem capability

`sparse → developing → broad → mature → fragmented`

### Local diffusion

`unavailable → rare/shared → specialist → accessible → common`

### Installed-base value

`small → established → entrenched → legacy-critical`

Оси независимы. Нет authoritative universal lifecycle stage или Technology Score.

## Ecosystem context

Отдельные dimensions:

- tooling;
- documentation/learning sources;
- component breadth;
- testing/delivery support;
- interoperability;
- community feedback;
- maintenance/support channels;
- dependency/verification burden.

Большая ecosystem может ускорять delivery и одновременно повышать fragmentation/dependency/migration burden. Она не является фиксированным multiplier.

## Version bands

Band создаётся, если текущий gameplay существенно меняется минимум по двум направлениям:

- paradigm/API;
- compatibility;
- tooling/ecosystem;
- platform/deployment;
- support/maintenance;
- market/project opportunity;
- learning burden;
- migration risk.

Compatibility/support break может оправдать band самостоятельно, если создаёт обязательное player decision.

Не хранятся каждая semver, patch, package or IDE update. Runtime не является package solver.

## Directed transfer

```ts
type TransferEdge = Readonly<{
  from: TechnologyFamilyId;
  to: TechnologyFamilyId;
  conceptualBps: BasisPoints;
  initialLearningBps: BasisPoints;
  fluencyReacquisitionBps: BasisPoints;
  reasonTags: readonly TransferReasonTag[];
}>;
```

Compiler валидирует sparse directed graph. Runtime не вычисляет transfer по строковой похожести.

Transfer ускоряет learning/reacquisition, но не создаёт target familiarity без exposure/practice, production evidence или grade.

## Mastery, fluency, familiarity and recency

- mastery почти не деградирует;
- fluency после grace period стремится к mastery-based floor;
- familiarity быстрее теряет current relevance при major ecosystem/band shift;
- reacquisition быстрее initial acquisition;
- evidence recency — projection для current readiness;
- break не отменяет grade;
- catalog/adoption change сам по себе не меняет familiarity.

## Technology choices

Meaningful options include:

- знакомый стабильный context;
- mainstream ecosystem;
- emerging technology;
- legacy compatibility;
- version/technology migration;
- tooling/verification improvement;
- scope reduction for compatibility;
- defer until access.

Ни один тип не является globally best. Provider разрешает outcome; Technology Engine предоставляет context/reasons.

## Historical and local availability

```text
global existence
→ platform/toolchain availability
→ fictional local diffusion
→ institution/source access
→ character practical access
```

Global release does not imply local access. Low-access path requires school/shared/mentor/employer/used-equipment/future-retry route.

Historical facts use source refs/precision/confidence. Adoption data preserves platform, geography, population, methodology and observed period. Repository activity, survey usage/desire, job demand and expert recommendation remain different signals.

## 1990 MVP

Only:

- one BASIC-like family/technology;
- one aggregate band;
- one PC/DOS-like platform;
- one aggregate editor/interpreter/compiler toolchain;
- printed manual/example route;
- home and school/shared access;
- one compatibility/support constraint;
- one technology-informed learning/project choice.

No full historical catalog, exact PC/IDE inventory or multiple progression bars.

## AI-era

AI assistant is a tool/ecosystem affordance, not a language, universal skill or fixed productivity bonus.

Modes remain distinct:

- explanation;
- completion;
- generation;
- diagnosis;
- review/verification;
- agentic execution.

Provider determines actual outcome/autonomy. Generated work needs verification/transfer before independent capability evidence.

## Specialization

`ProfessionalFocus` is selected; `SpecializationProfile` is derived from evidence/skills/technologies/contexts. Generalist requires breadth plus transfer evidence. Switching preserves mastery but needs new target practice/production contexts.

## Balance

- latest/mainstream not always optimal;
- early adoption gives opportunity plus instability/access burden;
- legacy preserves installed-base value plus support/maintenance risk;
- breadth without depth does not satisfy high-complexity evidence;
- one technology/context does not satisfy all Senior gates;
- easy switching/migration/transfer cannot farm progression;
- wealth/fame/title/popularity do not buy mastery;
- technology context shows 3–5 relevant traits, not full graph.

Metrics:

- mastery/fluency/familiarity;
- transfer/reacquisition;
- technology breadth/depth;
- latest/mainstream/legacy choice distribution;
- migration/transfer farming;
- access equity;
- source coverage/triangulation;
- context comprehension;
- restart/history compatibility.

## Persistence and compatibility

Active attempt/project stores immutable technology context snapshot/reference/fingerprint as needed. Committed release/episode/history preserves semantic technology/band/platform/toolchain/support/constraint snapshot.

Catalog update cannot rewrite committed outcomes. Active mismatch requires exact-compatible content, controlled migration, abandon/recovery or Safe Mode/read-only history.

## Invariants

- technology is not skill or specialization;
- no one-dimensional technology ranking;
- no every-library progression;
- version band needs current gameplay;
- ecosystem dimensions remain separate;
- provider ownership preserved;
- familiarity only via Progression and practice;
- local diffusion explicitly fictional;
- source scope preserved;
- active context restart-safe;
- committed history immutable;
- low-access fallback exists;
- no dynamic web-driven authority or invented post-2026 real-product history.