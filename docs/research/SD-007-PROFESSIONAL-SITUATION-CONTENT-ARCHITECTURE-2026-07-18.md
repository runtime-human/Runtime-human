# SD-007 — Professional Situation & Content Architecture

- **Дата:** 2026-07-18
- **Статус:** normalized research; решения интегрированы через ADR-020
- **Scope:** professional situation authoring, bounded composition, semantic variety, coverage, anti-repeat, provider integration, Content Studio and compatibility
- **Implementation profile:** hand-authored MVP → bounded compile-time composition after first-playable evidence

## Executive verdict

Runtime Human не нужен runtime-генератор профессиональных историй и не нужна библиотека из тысяч полностью монолитных карточек.

Нужна система, которая сохраняет авторское профессиональное ядро, но позволяет переиспользовать валидные context/pressure/consequence/presentation parts:

```text
authored professional dilemma
→ bounded compatible context
→ meaningful pressure
→ typed provider consequence
→ compile-time materialized variant
→ Event/Director selection
→ Challenge resolution
→ provider outcome
```

Главное решение:

> **Профессиональная ситуация считается новой только тогда, когда меняется смысл решения, доступные подходы, последствия или recovery — не когда меняется название технологии, компании, NPC или текст.**

## 1. Проблема масштаба

Текущий Challenge Engine уже задаёт сильный contract:

- конкретная Technical Situation;
- 1–2 причины сложности;
- 2–4 подхода;
- deterministic outcome;
- provider application;
- ExperienceEpisode;
- recovery/next step;
- repetition fingerprint.

Но без отдельной content architecture возникают два противоположных риска.

### Полностью ручная библиотека

Каждый новый provider, technology, era и pressure приводит к копированию полной карточки.

Последствия:

- одинаковые approaches размножаются в десятках файлов;
- общую ошибку причинности трудно исправить централизованно;
- похожие карточки выглядят как новый content count;
- сложно видеть покрытие по archetype, dilemma, cause и recovery;
- локализация и QA растут быстрее реального gameplay diversity.

### Свободная procedural/LLM generation

Генератор комбинирует произвольные части или создаёт текст в runtime.

Последствия:

- невозможно заранее проверить все provider effects;
- historical/technology context может стать неверным;
- варианты могут иметь скрытый правильный ответ;
- event participants и persistent arcs могут нарушиться;
- result text может не соответствовать actual outcome;
- fingerprints и recovery зависят от model/prompt;
- обновление модели переписывает фактический content corpus;
- QA становится sampling, а не доказуемой валидацией.

## 2. Исследовательные опоры

### PCG representations and authorial control

Shaker, Togelius и Nelson рассматривают procedural content через representation, search space, evaluation и mixed-initiative authoring. Для Runtime Human это означает: пространство вариантов должно быть явно ограничено representation и quality constraints, а не предполагаться качественным из-за большого количества комбинаций.

Проектное применение:

- authored semantic components;
- explicit composition sets;
- bounded materialization;
- deterministic evaluation;
- human review of high-level meaning.

### Event-centric authored narrative

PAStE и связанные event-centric systems показывают полезную границу: автор описывает содержательный event unit и роли, а system связывает его с текущим world context. Это ближе к Runtime Human, чем свободная генерация plot.

Проектное применение:

- Situation Kernel остаётся authored event/problem unit;
- Context Frame связывает kernel с provider/source/participants;
- Event Engine по-прежнему владеет chains/effects wrapper;
- Narrative Director выбирает eligible candidates, но не создаёт dilemma.

### Quality-Based Narrative / storylets

Практика Failbetter показывает ценность небольших state-gated authored units, но также content debt: большое число почти одинаковых storylets трудно поддерживать. Их урок для Runtime Human — не создавать отдельную монолитную definition для каждой комбинации, но и не превращать content в универсальную grammar без авторского контроля.

Проектное применение:

- focused composition sets;
- stable semantic signatures;
- shared pressure/presentation components;
- explicit follow-up hooks;
- duplicate clusters and authoring debt metrics.

### ink and modular authored state

ink подтверждает практичность modular authored sections и deterministic stateful runtime. Runtime Human не использует ink как authoritative gameplay engine, но принимает идею: авторские units и transitions должны быть отделены от presentation и собраны в reproducible content package.

### Combinatorial testing

NIST pairwise/combinatorial testing показывает, что interaction coverage можно улучшать без полного Cartesian product. Это полезно для content QA, но не означает необходимость материализовать каждую пару.

Проектное применение:

- explicit mandatory tuples;
- pairwise coverage только по selected risk dimensions;
- invalid/deferred exceptions;
- targeted higher-order fixtures;
- build budgets before expansion.

### Recent generative narrative research

NarrativeGenie, SceneCraft и PANGeA демонстрируют authoring leverage от LLM/structured generation, но сами используют goals, schemas, validation or controlled pipelines. Для Runtime Human это подтверждает возможность позднего offline authoring assistant, а не готовность сделать runtime LLM authority.

## 3. Сравнение подходов

| Подход | Причинность | Масштабирование | Determinism | QA | Вывод |
|---|---:|---:|---:|---:|---|
| Монолитные ручные ситуации | высокая | низкое | высокое | понятный, дорогой | MVP/flagship |
| Полный Cartesian шаблонов | низкая/средняя | формально высокое | высокое | слишком много мусора | отклонить |
| Runtime rules grammar | средняя | высокое | возможно | сложно проверить meaning | отклонить baseline |
| Runtime LLM | непредсказуемая | высокое | слабое | sampling | отклонить |
| Bounded compile-time composition | высокая при хороших kernels | среднее/высокое | высокое | все variants известны | выбрать |

## 4. Центральная единица — Situation Kernel

Kernel — не текстовый шаблон и не generic event category.

Он хранит:

- professional goal;
- archetype;
- invariant dilemma;
- semantic approach intents;
- outcome pattern;
- stage limits;
- provider capability requirements;
- semantic novelty identity.

Kernel должен оставаться понятным после удаления конкретных имён, технологий и эпохи.

### Проверочный вопрос

> Если заменить employer, technology и participant, остаётся ли та же профессиональная проблема?

Если нет — definition, вероятно, является context-specific flagship situation, а не reusable kernel.

## 5. Почему approaches принадлежат kernel

Свободная сборка buttons создаёт ложные комбинации:

- «попросить помощь» может быть разумно в learning/workplace, но бессмысленно без help route;
- «уменьшить scope» применимо к delivery, но не ко всякому diagnosis;
- «усилить качество» может дублировать goal improve;
- «быстро исправить» и «немедленно внести patch» являются semantic duplicate.

Поэтому kernel задаёт intents и invariant trade-offs. Context/pressure могут:

- менять availability;
- менять player-facing wording;
- менять forecast;
- менять compromise/recovery.

Они не могут заменить intent другим действием.

## 6. Context Frame и Provider ownership

Context Frame связывает kernel с public provider contract:

- Learning;
- Project;
- Career/hiring;
- workplace;
- Open Source;
- Company/Leadership;
- Event-wrapped professional situation.

Он определяет source type, stage, era, technology selectors, participant roles, access assumptions и stakes range.

Context не:

- изменяет ProjectState;
- выдаёт offer;
- создаёт learning outcome;
- меняет NPC relationship;
- начисляет evidence.

Provider остаётся владельцем eligibility и application.

## 7. Pressure как причина нового решения

Pressure оправдан только если меняет выбор.

Например, `weak-documentation` может:

- повысить ценность experimentation;
- сделать fast implementation рискованнее;
- открыть mentor/community help;
- создать partial outcome через diagnostic notes.

Если карточка лишь говорит «документация плохая», но approaches/outcomes не меняются, это presentation flavor, а не pressure package.

## 8. Consequence Bridge

Один kernel может иметь разные domain consequences:

### Learning

- modified example completed;
- assisted artifact;
- incomplete understanding;
- independent transfer unlocked.

### Project

- Work Package progress;
- limitation/debt;
- delay;
- known issue;
- recovery package.

### Hiring

- employer signal;
- alternate role;
- rejection with next step;
- no production evidence.

### Workplace

- trust/scope change;
- project request effect;
- communication follow-up;
- promotion discussion hook.

Bridge должен быть provider-specific и typed. Общий kernel не означает общий raw effect.

## 9. Presentation отделена от semantics

Нужно поддерживать:

- era vocabulary;
- beginner versus workplace tone;
- different participant phrasing;
- RU long text;
- accessibility copy;
- historical/non-diegetic explanations.

Но presentation cannot change:

- dilemma;
- approaches;
- cause semantics;
- provider effect;
- outcome classes;
- follow-up meaning.

Поэтому presentation-only variants группируются в одну semantic situation и не обходят anti-repeat.

## 10. Materialization before runtime

Content compiler:

1. загружает stable components;
2. перечисляет candidate tuples в canonical order;
3. применяет explicit constraints;
4. строит semantic composition;
5. проверяет kernel/context/pressure/bridge;
6. проверяет chronology/access/technology;
7. привязывает presentation;
8. создаёт stable ID/signature/fingerprint;
9. выпускает immutable registry;
10. строит diagnostics/coverage/duplicate reports.

Runtime:

- только фильтрует compiled registry по provider request;
- передаёт candidates Event/Director;
- материализует existing TechnicalSituation contract;
- никогда не создаёт новый tuple.

## 11. Semantic anti-repeat

Exact ID недостаточно.

Похожесть отслеживается по:

- kernel;
- dilemma;
- approach shape;
- cause set;
- consequence classes;
- provider/archetype;
- participant roles;
- follow-up classes;
- technology family when it changes constraints.

Presentation-only change не сбрасывает repetition.

### Why embeddings are not authority

Embeddings могут позднее подсказать textual cluster, но:

- semantic IDs уже известны;
- exact rule checks воспроизводимы;
- multilingual wording может искажать similarity;
- model update меняет threshold behavior.

Поэтому embeddings/LLM разрешены только как offline warning assistant after deterministic checks.

## 12. Coverage without false completeness

Coverage target охватывает только gameplay-important dimensions:

- stage;
- provider;
- archetype;
- dilemma;
- cause;
- approach shape;
- outcome/recovery;
- technology context;
- assistance/autonomy;
- era.

Используются:

- mandatory tuples for critical flow;
- pairwise heuristic for selected dimensions;
- targeted higher-order fixtures;
- invalid/deferred exceptions;
- exposure simulation.

Coverage не должна засчитываться, если variant:

- invalid;
- never eligible;
- presentation-only duplicate;
- belongs to unimplemented provider;
- has no provider bridge/recovery.

## 13. First-month and first-year scope

### January MVP

Не создавать generator breadth.

Existing diagnose situation становится:

- one kernel;
- one personal-project context;
- one limited-observability/input pressure;
- one project bridge;
- one presentation pack;
- one compiled variant.

Это проверяет architecture seam без content explosion.

### First year hypothesis

- 6–10 kernels;
- build/diagnose/improve/integrate;
- 12–24 semantic variants;
- Learning and Project contexts;
- 2–3 technology contexts;
- assistance/autonomy;
- scope/quality;
- interruption/recovery;
- transfer;
- semantic repetition report.

Бюджет пересматривается после player perceived-repetition data.

## 14. Content Studio

Content Studio должен показывать:

- player-facing choice;
- kernel/dilemma;
- context/pressure compatibility;
- provider bridge;
- materialization budget;
- semantic signature;
- nearest duplicates;
- coverage gaps;
- deterministic fixture;
- long-RU/accessibility.

Не нужен initial visual graph editor. Form/table/matrix workflow проще и лучше соответствует bounded data.

## 15. Compatibility and history

Committed history сохраняет:

- materialized variant ID/version;
- semantic snapshot;
- source/provider snapshot;
- causes/approaches;
- selected approach;
- outcome/consequence/follow-up snapshot;
- fingerprints.

Catalog update:

- не переписывает past result;
- не заменяет variant silently;
- не reroll active visible decision;
- требует mapping/tombstone/recovery для active draft;
- может изменить future eligibility only through new version.

## 16. Balance verdict

Количество variants не является KPI качества.

Система должна отдельно измерять:

- unique dilemmas;
- unique approach shapes;
- semantic signature count;
- reskin clusters;
- dominant approaches;
- never-eligible/never-selected variants;
- coverage exposure;
- player perceived repetition;
- authoring/review cost;
- follow-up/recovery completeness.

Expansion блокируется, если semantic diversity растёт значительно медленнее total variant count.

## 17. Security and modding

Content remains data-only.

Forbidden:

- arbitrary JS;
- runtime LLM/network calls;
- raw effects/state patches;
- unbounded tuple expansion;
- user-provided prompt execution;
- unstable IDs;
- fabricated historical constraints;
- hidden exact reward tables.

Mods pass same compiler/validator. A mod cannot require runtime generation while declaring baseline compatibility.

## 18. Decision summary

Принято:

- bounded compile-time composition;
- authored Situation Kernels;
- provider-specific Consequence Bridges;
- presentation/semantics separation;
- immutable materialized registry;
- semantic signatures and anti-repeat;
- targeted/pairwise coverage;
- deterministic Content Studio fixtures;
- no runtime generation/LLM authority.

Отклонено:

- full manual-only long-term corpus;
- full Cartesian templates;
- generic runtime grammar;
- runtime LLM scenarios/judging;
- embeddings as authoritative duplicate check;
- variant count as content quality.

## 19. Нормативные результаты

- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md);
- [Professional Situation Content](../content/PROFESSIONAL-SITUATION-CONTENT.md);
- [Content Studio UI](../ui/PROFESSIONAL-SITUATION-CONTENT-UI.md);
- [Balance, Coverage & Variety](../simulation/PROFESSIONAL-SITUATION-CONTENT-BALANCE.md);
- [Compatibility](../persistence/PROFESSIONAL-SITUATION-CONTENT-COMPATIBILITY.md);
- implementation plan.

## 20. Источники

- Shaker, Togelius, Nelson, *Procedural Content Generation in Games*: https://www.pcgbook.com/
- Shoulson, Kapadia, Badler, *PAStE*: https://doi.org/10.1609/aiide.v9i4.12628
- Tomai, *Exploring Abductive Event Binding for Opportunistic Storytelling*: https://doi.org/10.1609/aiide.v10i1.12731
- Poulakos et al., *Towards an Accessible Interface for Story World Building*: https://doi.org/10.1609/aiide.v11i4.12833
- Failbetter Games, StoryNexus/Quality-Based Narrative developer materials: https://www.failbettergames.com/news/storynexus-developer-diary-2-fewer-spreadsheets-less-swearing
- ink official documentation: https://www.inklestudios.com/ink/
- NIST, *Practical Combinatorial Testing: Beyond Pairwise*: https://www.nist.gov/publications/practical-combinatorial-testing-beyond-pairwise
- Kumaran et al., *NarrativeGenie*: https://doi.org/10.1609/aiide.v20i1.31868
- Kumaran et al., *SceneCraft*: https://doi.org/10.1609/aiide.v19i1.27504
- Buongiorno et al., *PANGeA*: https://doi.org/10.1609/aiide.v20i1.31876
