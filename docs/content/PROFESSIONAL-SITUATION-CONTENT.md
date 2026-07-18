---
title: "Professional Situation Content"
type: content
status: draft
canon: true
depends_on: [ADR-020]
updated: 2026-07-18
---

# Professional Situation Content

## Статус

Нормативная content-спецификация для [Professional Situation Content Composition Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md).

Основание:

- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md);
- [Content Architecture](CONTENT-ARCHITECTURE.md);
- [Technology Ecosystem Content](TECHNOLOGY-ECOSYSTEM-CONTENT.md);
- [Programmer Learning Content](PROGRAMMER-LEARNING-CONTENT.md);
- [Programmer Career Content](PROGRAMMER-CAREER-CONTENT.md).

## 1. Цель

Определить данные, из которых compiler собирает ограниченный corpus профессиональных ситуаций. Content должен создавать новые решения, а не только новые названия, персонажей или формулировки.

Content не:

- исполняет произвольный код;
- меняет save напрямую;
- определяет event pacing;
- рассчитывает challenge outcome;
- начисляет mastery/evidence/grade;
- создаёт реальные исторические факты без sourceRefs;
- обращается к сети или LLM в runtime.

## 2. Namespaces

```text
core.situation-kernel.*
core.situation-context.*
core.situation-pressure.*
core.situation-outcome-pattern.*
core.situation-bridge.*
core.situation-presentation.*
core.situation-composition-set.*
core.situation-coverage-target.*
core.situation-diagnostic.*
```

Stable IDs не выводятся из display names. Generated materialized IDs выводятся только из stable IDs и compiler rules version.

## 3. Professional dilemma taxonomy

Начальный vocabulary:

### Discovery and uncertainty

- `dilemma.investigate-vs-patch`;
- `dilemma.clarify-vs-assume`;
- `dilemma.prototype-vs-commit`;
- `dilemma.measure-vs-guess`.

### Delivery and scope

- `dilemma.scope-vs-deadline`;
- `dilemma.speed-vs-quality`;
- `dilemma.release-vs-delay`;
- `dilemma.shortcut-vs-maintainability`.

### Assistance and autonomy

- `dilemma.ask-help-vs-continue-alone`;
- `dilemma.guided-result-vs-independent-transfer`;
- `dilemma.review-now-vs-rework-later`.

### Integration and legacy

- `dilemma.adapter-vs-rewrite`;
- `dilemma.compatibility-vs-modernization`;
- `dilemma.local-fix-vs-systemic-change`;
- `dilemma.dependency-vs-own-implementation`.

### Communication and responsibility

- `dilemma.disclose-risk-vs-protect-image`;
- `dilemma.negotiate-scope-vs-accept-promise`;
- `dilemma.take-ownership-vs-remain-bounded`;
- `dilemma.correct-vs-accommodate-local-practice`.

Taxonomy не является полным skill tree. Новый dilemma ID добавляется, когда он создаёт новый выбор, а не новую тему.

## 4. Goal classes

- understand-cause;
- create-working-result;
- improve-quality;
- integrate-boundary;
- recover-service-or-data;
- deliver-under-constraint;
- communicate-technical-risk;
- review-or-help-other;
- accept-or-negotiate-responsibility;
- migrate-or-maintain.

## 5. Kernel authoring

Каждый kernel обязан ответить:

1. Какой professional goal?
2. В чём dilemma?
3. Почему минимум два approach могут быть разумными?
4. В каких contexts один approach становится сильнее или слабее?
5. Какие partial/failure results остаются содержательными?
6. Что является recovery/next challenge?
7. Как отличить эту ситуацию от существующих kernels?

### Kernel card

Authoring card показывает:

- short professional title;
- archetype;
- goal class;
- dilemma;
- professional stage;
- approach intents;
- outcome pattern;
- required provider capabilities;
- coverage labels;
- nearest existing kernels.

### Kernel rejection examples

Reject:

> «В программе ошибка. Исправить быстро или медленно?»

Нет конкретной dilemma и профессиональной разницы.

Reject:

> «Выберите C# или Java»

Это technology preference, а не ситуация, если не описаны context, constraints и consequences.

Reject:

> «Использовать правильный алгоритм или неправильный»

Скрытый правильный ответ.

Accept:

> «Ошибка проявляется только на части входных данных. Сначала воспроизвести и локализовать её, выпустить ограничение на ввод или попросить преподавателя показать проблемное место».

Есть цель, uncertainty, trade-offs и assistance semantics.

## 6. Context families

### Learning

- guided exercise;
- modified worked example;
- independent exercise;
- personal practice program;
- teacher/mentor review;
- code-reading exercise;
- reacquisition after break.

### Project

- first personal tool;
- bounded feature;
- data import/export;
- maintenance change;
- quality improvement;
- release preparation;
- known-issue recovery.

### Career/hiring

- portfolio discussion;
- bounded work sample;
- situational interview;
- onboarding task;
- first independent workplace task;
- scope/promotion discussion.

### Open source

Deferred until system exists:

- first contribution;
- maintainer review;
- issue diagnosis;
- compatibility discussion;
- release/support decision.

### Company/leadership

Deferred:

- architecture alignment;
- delegation;
- review conflict;
- incident ownership;
- portfolio priority.

Context family is not provider implementation. Concrete frame references public provider contracts.

## 7. Pressure authoring

Pressure package is valid only when it changes at least one of:

- approach availability;
- forecast;
- compromise;
- stakes;
- assistance value;
- recovery cost;
- follow-up.

### Examples

#### Weak documentation

May:

- strengthen value of experimentation;
- make immediate implementation riskier;
- increase mentor/community value;
- create partial progress through notes/reproduction.

#### Deadline pressure

May:

- make scope reduction attractive;
- increase compromise risk;
- create delayed quality consequence;
- make exhaustive investigation costly.

#### Legacy constraints

May:

- block clean rewrite;
- increase compatibility importance;
- make local fix reasonable;
- create future modernization hook.

#### Limited observability

May:

- make reproduction/instrumentation central;
- lower confidence of fast patch;
- create recovered outcome after additional diagnostics.

Invalid pressure:

- different weather;
- renamed customer;
- decorative urgency with unchanged effects;
- «technology is hard» without specific constraint.

## 8. Context-pressure compatibility

Examples of prohibited combinations:

- production outage in age-12 January beginner slice;
- global distributed coordination before historically valid infrastructure;
- AI assistant before allowed era/context;
- high-stakes financial migration in a first exercise;
- unsupported version pressure before relevant version band exists;
- team-credit dispute without team/provider contribution model.

Examples of allowed transformed combinations:

- weak documentation in printed manual context;
- weak documentation in legacy workplace context;
- limited observability in simple input bug through lack of tooling;
- limited observability in production through missing telemetry;
- scope/deadline dilemma in school project or employer feature with different consequence bridge.

## 9. Approach authoring

Approach wording follows pattern:

```text
Action intent
+ visible method
+ expected advantage
+ visible trade-off
```

Example:

> Сначала воспроизвести ошибку и проверить входные данные. Это займёт больше времени, но снизит риск исправить не ту причину.

Bad:

> Тщательно исследовать (+20% качество, −10% скорость).

### Semantic duplicates

Compiler treats these as likely duplicates:

- «исследовать проблему» and «разобраться подробнее»;
- «попросить помощь» and «обратиться к наставнику», если assistance level одинаков;
- «сделать быстро» and «сразу написать исправление».

Different wording is allowed only for era/tone/localization, not as a new approach intent.

## 10. Outcome and consequence authoring

Content maps semantic classes:

- clean-success;
- success-with-compromise;
- partial-progress;
- failed-with-learning;
- recovered.

Provider bridge must explain:

- what changed in provider domain;
- what did not change;
- assistance/autonomy;
- immediate compromise;
- delayed hook;
- recovery/next step;
- eligible episode facts.

### No false evidence

- hiring work sample does not become production delivery;
- copied example does not become independent application;
- team success without contribution does not become character capability;
- fast patch without diagnosis cannot claim cause-understanding;
- failed release can create recovery/operations learning without full quality evidence.

## 11. Follow-up taxonomy

- repeat-with-less-help;
- transfer-to-new-context;
- increase-scope;
- investigate-deeper-cause;
- repair-compromise;
- document-or-test-result;
- modernize-later;
- seek-feedback;
- retry-after-access;
- retry-after-learning;
- career-opportunity-follow-up;
- relationship-or-trust-follow-up;
- incident-or-support-follow-up.

Follow-up may become provider action, Event hook or future candidate. Content cannot guarantee it will surface immediately.

## 12. Presentation authoring

Normal text budget target:

- title: one short line;
- summary: 1–3 sentences;
- causes: at most two;
- goal: one sentence;
- approach label: one line;
- forecast/trade-off: 1–2 sentences;
- result: 3–6 short lines.

Details may contain:

- context explanation;
- technology/support constraints;
- participant roles;
- provider effect summary;
- prior-decision linkage;
- content provenance/debug information outside production normal mode.

### Era vocabulary

Presentation must not use concepts before their era unless explicitly translated for player understanding in non-diegetic UI.

Examples:

- 1990 character copy avoids modern cloud/DevOps vocabulary;
- player-facing explanatory UI may say «средства отладки ограничены»;
- source-authentic names require historical catalog validation;
- fictional employer/product names remain separate from real facts.

## 13. Composition sets

Composition set should represent one coherent content initiative, for example:

- first-year debugging situations;
- early personal project scope decisions;
- first-job hiring situations;
- workplace legacy maintenance;
- open-source review situations.

Do not create one universal set containing all kernels and contexts.

### Budget recommendations

MVP:

- 1 kernel;
- 1 context;
- 1 pressure;
- 1 bridge;
- 1 presentation;
- 1 materialized variant.

First-year set:

- 2–4 kernels per focused set;
- 2–3 compatible context frames;
- 1–3 pressure packages;
- maximum 6–12 semantic variants per set;
- maximum two presentation variants per semantic composition.

The compiler fails on overflow; author splits the set or narrows constraints.

## 14. Coverage obligations

### First-month

Required:

- diagnose archetype;
- investigate-vs-patch dilemma;
- independent/ask-help/reduce-scope/defer semantics;
- one complication;
- partial and recovery outcomes;
- low-access valid route;
- one follow-up.

### First year

Starting obligations:

- build, diagnose, improve and integrate represented;
- at least two different dilemmas per repeated archetype;
- at least one assistance/autonomy decision;
- at least one scope/quality decision;
- at least one technology/context transfer;
- at least one interruption/recovery;
- no approach shape used in more than half of meaningful situations without review;
- no cause dominates merely because it is easy to write;
- every kernel has one valid low-resource or alternate route where applicable.

### Career Slice

- portfolio explanation;
- bounded technical work sample;
- workplace first task;
- communication/scope risk;
- employer cancellation separated from candidate failure;
- production evidence rules preserved.

## 15. Semantic signature rules

Two situations are semantic duplicates when they share:

- same dilemma;
- same approach intents;
- same causes;
- same provider/context class;
- same consequence classes;
- same follow-up class;

and differ only by:

- names;
- technology label without changed constraints;
- participant identity without relationship effect;
- presentation wording;
- cosmetic stakes.

Near-duplicate warning uses weighted exact dimensions. Human review decides whether changed context creates genuinely different trade-off.

## 16. Content review checklist

### Professional correctness

- dilemma exists in real programming work or plausible learning context;
- approaches are understandable without syntax trivia;
- no universal best answer;
- consequence follows from context and approach;
- technical language is accurate for era/stage.

### Product fit

- programmer-first;
- one meaningful decision;
- normal UI readable in 10–20 seconds target;
- no Jira/IDE/LMS simulation;
- result explains causality;
- next step exists.

### Architecture

- provider owns domain effect;
- Challenge resolves outcome;
- Event/Director own chain/pacing;
- Progression owns evidence;
- stable IDs and snapshots exist;
- no arbitrary script.

### Diversity

- kernel/dilemma is not a reskin;
- approach shape is not overused;
- pressure changes choice;
- participants/context add gameplay meaning;
- coverage target improved.

## 17. Source and research policy

Professional situations may be inspired by:

- official documentation and postmortems;
- public engineering incident reports;
- software engineering research;
- anonymized practitioner patterns;
- historical manuals and technology constraints;
- game-design research on event/storylet systems.

They must not:

- reproduce private/confidential incidents;
- identify real ordinary individuals;
- turn one company practice into universal truth;
- copy copyrighted prose/dialogue;
- present weak anecdote as historical fact.

Source refs are required when situation depends on a real historical/technical claim. Generic fictional dilemmas may use design provenance instead of factual source refs.

## 18. Modding

Data-only mods may add supported kernels/components/composition sets.

Forbidden:

- executable scripts;
- runtime network/LLM calls;
- direct state patches;
- content-defined arbitrary formulas;
- missing stable IDs/version;
- fake historical availability;
- unbounded Cartesian expansion;
- variants that permanently block vanilla progression;
- presentation-only spam declared as semantic variety.

## 19. Definition of Done

A focused situation content set is ready when:

- all components compile;
- materialization stays inside budget;
- every variant has stable ID/signature/fingerprint;
- provider bridge validates;
- chronology/access validate;
- approaches are distinct;
- dominant-approach fixtures pass;
- failure/recovery mapping exists;
- duplicate report reviewed;
- coverage target met or exception documented;
- Normal/long-RU previews pass;
- golden fixtures and expected explanations exist;
- runtime requires no free generation.
