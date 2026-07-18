---
title: "SKILLS-AND-TECHNOLOGIES"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Навыки и технологии

Нормативные спецификации:

- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression & Evidence Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Разделение понятий

- **Aptitude** — узкая медленно меняющаяся предрасположенность.
- **Skill** — переносимая профессиональная способность.
- **Facet** — task-specific детализация без отдельной progression bar.
- **Capability** — human-readable derived утверждение о доказанной способности.
- **Technology** — язык/framework/platform/tool с gameplay-значимым lifecycle.
- **Technology family** — группа transfer и общих mechanics.
- **Version band** — крупная compatibility/era-линия, а не каждая версия.
- **Specialization** — derived профиль практики/evidence.
- **Professional Evidence** — подтверждённое применение capability в контексте.

Docker не является языком, C# не является специализацией, а Programming не является одной technology. Контент и UI обязаны сохранять категории.

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

Следующие понятия обычно являются facets/task tags:

- Algorithmic Reasoning;
- Systems Thinking;
- Computational Constraints;
- Code Reading;
- Version Control;
- Documentation;
- Development Tools;
- Performance;
- Reliability;
- Security;
- Incident Handling;
- Legacy Modernization;
- Planning/Estimation;
- Release Management;
- Public Speaking/Technical Writing;
- Hiring/Delegation;
- Product Discovery/Marketing/Sales.

Facet становится отдельным skill только если:

- регулярно создаёт самостоятельные decisions;
- имеет независимые providers/evidence;
- нужен нескольким paths;
- его нельзя корректно объяснить через существующий skill;
- content/UX cost оправдан.

Публичные, предпринимательские и management capabilities могут иметь собственные systems/read models, но не заменяют programmer mastery.

## Представление skill progress

Authoritative state:

- mastery;
- fluency;
- last practice;
- strongest demonstrated capability band.

Normal UI показывает capability text и broad level. Advanced UI показывает mastery/fluency/evidence. Не хранится общий XP, определяющий grade.

## Learning и evidence разделены

### Mastery gain

Зависит от:

- challenge match;
- novelty;
- feedback;
- reflection;
- capacity;
- diminishing returns.

### Fluency

Зависит от текущей практики, outcome stability и reacquisition.

### Evidence

Зависит от demonstrated challenge band, completion, quality, autonomy, confidence, context novelty и anti-repeat.

Assistance может повысить learning и снизить autonomy evidence. Failure может дать debugging/recovery learning, но не full delivery/quality evidence.

Все authoritative coefficients integer/fixed-point.

## Professional Evidence

Skill/technology progression не растёт только от прошедшего времени.

Meaningful provider outcome создаёт `ExperienceEpisode`, который Progression Core превращает в:

- skill/technology delta;
- evidence claims;
- monthly practice aggregate;
- explanations.

Курс даёт mastery/учебное evidence; production evidence требует project/work/open-source context. Mentoring evidence требует traceable learner/downstream outcome.

## Technology definition

Technology содержит:

- stable ID/version;
- content tier A/B/C;
- category;
- family;
- paradigms/facets;
- prerequisites;
- historical lifecycle;
- local availability;
- hardware/platform requirements;
- learning curve;
- market demand by era;
- compatible project kinds;
- version band/compatibility profile;
- ecosystem maturity;
- documentation/community availability;
- obsolescence/legacy/end-of-support profile.

## Technology lifecycle

```text
announced
→ available
→ learnable locally
→ early adoption
→ growing demand
→ mainstream
→ mature
→ declining
→ legacy
→ end-of-support
```

Creation, public release, local availability, production maturity и demand моделируются раздельно.

## Content tiers

### Tier A

Уникальный lifecycle, proficiency, trade-offs, market role и events.

### Tier B

Technology identity с общей family mechanics и ограниченным unique content/state.

### Tier C

Requirement/tag/context без отдельной proficiency bar.

UI не показывает Tier C как collectible progression.

## Version bands

Не хранится каждая semver version.

Новый `TechnologyVersionBand` создаётся, если существенно меняются минимум два фактора:

- paradigm/API model;
- tooling/ecosystem;
- compatibility;
- market demand;
- project risks;
- learning burden.

## Directed transfer

Transfer задаётся sparse directed edges:

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

Content compiler валидирует dimensions и компилирует runtime edge. Runtime не вычисляет transfer динамически из строковой похожести.

Transfer:

- ускоряет initial learning;
- ускоряет reacquisition;
- не создаёт production evidence;
- не повышает grade напрямую;
- не заменяет familiarity в target technology.

## Mastery, fluency, familiarity и recency

- mastery почти не деградирует;
- fluency имеет grace period и затем медленно стремится к mastery-based floor;
- technology familiarity снижается быстрее при major ecosystem shift;
- reacquisition быстрее initial acquisition;
- evidence recency вычисляется projection и влияет на current market readiness;
- short break не отменяет grade.

## Specialization

- `ProfessionalFocus` выбирается игроком;
- `SpecializationProfile` выводится из evidence/skills/technologies/contexts;
- primary/secondary показываются при достаточной confidence;
- generalist требует устойчивой breadth/transfer evidence;
- смена specialization сохраняет mastery и требует новых production contexts.

## Баланс

- latest technology не всегда оптимальна;
- early adoption даёт opportunity и instability risk;
- legacy сохраняет demand/support burden;
- breadth без depth не закрывает high-complexity evidence;
- depth повышает expertise и market concentration risk;
- easy task repetition агрегируется и получает diminishing;
- passive learning не создаёт Senior evidence;
- wealth/fame/title не покупают mastery;
- one technology/context не закрывает все Senior gates.

## Balance metrics

- skill gain by source/challenge/outcome;
- mastery vs fluency;
- evidence diversity/context concentration;
- transfer efficiency;
- reacquisition time;
- technology breadth/depth;
- latest-tech dominance;
- legacy viability;
- Tier A/B/C exposure;
- course/easy-task/mentor farming;
- specialization switch;
- current market readiness recovery;
- grade contribution/gate coverage.
