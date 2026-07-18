# ADR-019 — Авторитетная модель исторических технологий, tooling и ecosystem context

- **Статус:** Accepted
- **Дата:** 2026-07-18
- **Решение владельца:** технологии моделируются как исторически и локально ограниченные профессиональные контексты с отдельными осями зрелости, поддержки, совместимости, экосистемы, доступности и спроса; они не являются линейным tech tree, единым рейтингом или источником навыков сами по себе
- **Связанные ADR:** ADR-001, ADR-003, ADR-007, ADR-010, ADR-013, ADR-014, ADR-015, ADR-016, ADR-017, ADR-018
- **Связанные спецификации:** `docs/game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md`, `docs/game-design/SKILLS-AND-TECHNOLOGIES.md`, `docs/content/HISTORICAL-TECHNOLOGY-CATALOG.md`, `docs/content/TECHNOLOGY-ECOSYSTEM-CONTENT.md`, `docs/ui/TECHNOLOGY-ECOSYSTEM-UI.md`

## Контекст

Runtime Human должен пройти путь от локальной компьютерной среды 1990 года до технологий и AI-assisted разработки 2026 года, а затем перейти в явно вымышленное будущее.

Текущий канон уже различает:

- skill, technology, technology family и version band;
- mastery, fluency и technology familiarity;
- global existence, local availability и practical access;
- learning, project, career и progression ownership;
- historical source facts и вымышленный локальный город;
- casual UI и глубокую внутреннюю модель.

Но без отдельного ownership технологическая история может выродиться в один из двух плохих вариантов.

### Линейное дерево улучшений

```text
BASIC
→ Pascal
→ C
→ C++
→ Java
→ C#
→ Rust
→ AI
```

Такой порядок исторически и профессионально неверен. Языки, платформы и инструменты существуют параллельно, служат разным задачам и могут сохранять ценность после появления более новых вариантов.

### Энциклопедический каталог

```text
каждый язык
+ каждая версия
+ каждая библиотека
+ каждый IDE
+ каждая ОС
+ каждый пакет
```

Это создаёт огромную content/schema нагрузку, version micromanagement и коллекционирование названий вместо решений программиста.

## Решение

### 1. Ввести Historical Technology, Tooling & Ecosystem Engine

Центральная цепочка:

```text
historical technology facts
→ fictional local diffusion
→ character practical access
→ Technology Context Snapshot
→ Learning / Project / Career provider decision
→ domain outcome
→ ExperienceEpisode
→ Progression familiarity and capability explanation
```

Engine является pure projection/resolution boundary. Он не заменяет Learning, Project, Career или Progression.

### 2. Разделить ownership

#### Historical Technology Catalog

Владеет подтверждаемыми фактами:

- identity и category технологии;
- family и prerequisites;
- first public release;
- major gameplay-relevant version bands;
- platform/runtime/toolchain dependencies;
- compatibility relations;
- support lifecycle;
- source references, precision и confidence;
- глобально наблюдаемыми ecosystem milestones;
- historical-through boundary.

Каталог не определяет фактический доступ конкретного персонажа и не симулирует локальный рынок автоматически.

#### City/Era content

Владеет вымышленной локальной адаптацией:

- local availability window;
- distribution channels;
- типичные institutional/employer contexts;
- локальную стоимость и редкость;
- fictional market diffusion;
- era-specific access constraints.

Локальная адаптация должна быть правдоподобна относительно source-backed global chronology, но не выдаётся за реальную статистику конкретной страны.

#### Equipment, Housing, School, NPC и Economy owners

Владеют practical access:

- устройство и platform;
- установленный toolchain;
- доступное время;
- возможность купить, взять или использовать shared equipment;
- наличие mentor/community/help route;
- доступ к сети, документации и distribution channel.

#### Technology Context Engine

Получает immutable facts и создаёт:

- `TechnologyContextSnapshot`;
- `EcosystemAffordanceSnapshot`;
- совместимые project/learning/career options;
- reason codes;
- compatibility/support warnings;
- deterministic context fingerprint.

Он не:

- покупает оборудование;
- устанавливает программы без owner command;
- меняет familiarity;
- выбирает project outcome;
- выдаёт работу;
- меняет global/local history;
- вычисляет Professional Grade.

#### Experience Providers

Learning, Project, Career, Open Source и Company:

- выбирают relevant technology context;
- создают meaningful situation/decision;
- применяют собственный domain outcome;
- создают `ExperienceEpisode`.

#### Professional Progression Core

Только Progression:

- меняет familiarity;
- применяет directed transfer;
- учитывает recency/reacquisition;
- подтверждает capabilities/evidence/grade;
- не переписывает историческую или проектную технологическую правду.

### 3. Разделить сущности

Следующие понятия не объединяются:

| Понятие | Значение |
|---|---|
| Technology identity | язык, runtime, framework, platform или tool с gameplay identity |
| Technology family | общая conceptual/operational transfer family |
| Version band | крупная совместимостная/экосистемная линия |
| Platform/toolchain context | среда, необходимая для использования |
| Ecosystem state | доступные affordances и risks вокруг технологии |
| Character familiarity | насколько персонаж способен работать с ней сейчас |
| Market demand | востребованность в конкретном labor-market context |
| Support status | maintained/security/support lifecycle |
| Local availability | присутствует ли технология в вымышленном городе/канале |
| Practical access | может ли конкретный персонаж реально использовать её сейчас |
| Project technology context | чем и в каких ограничениях построен конкретный project |

Ни одна сущность не заменяет остальные.

### 4. Не вводить универсальный Technology Score

Запрещены authoritative показатели:

```text
Technology Power = 87
Popularity = 74
Modernity = 92
Best Language = Rust
```

Вместо них используются отдельные bounded bands:

- release maturity;
- tooling maturity;
- documentation/learning reach;
- component/library breadth;
- interoperability;
- operational burden;
- maintenance/support risk;
- community/feedback reach;
- local access cost;
- labor-market reach;
- project fit.

Player-facing UI показывает только 3–5 relevant traits для текущего решения.

### 5. Lifecycle является многомерным

Одна линейная стадия недостаточна. Authoritative/projection axes:

#### Historical release maturity

```text
announced → preview/experimental → publicly available → established
```

#### Adoption/demand

```text
niche → emerging → growing → mainstream → concentrated/declining
```

#### Support/maintenance

```text
active → maintenance → security-only → unsupported
```

#### Ecosystem capability

```text
sparse → developing → broad → mature → fragmented/constrained
```

#### Local diffusion

```text
unavailable → rare/shared → specialist access → broadly accessible
```

#### Installed-base/legacy value

```text
small → established → entrenched → legacy-critical
```

Комбинации допустимы. Например:

- mature ecosystem + declining new demand + large legacy installed base;
- emerging demand + sparse tooling + active support;
- mainstream technology + unsupported old version band;
- globally available technology + no local practical access.

### 6. Version bands вместо каждой версии

`TechnologyVersionBand` создаётся только если изменение создаёт актуальный gameplay хотя бы по двум направлениям:

- paradigm/API model;
- compatibility;
- tooling/ecosystem;
- deployment/platform;
- support/security;
- market/project opportunity;
- learning burden;
- migration risk.

Не моделируются:

- каждая semver/patch release;
- package-lock graph;
- package manager resolution;
- transitive dependency inventory;
- каждое обновление IDE.

Compatibility graph компилируется из content и используется как bounded deterministic context, а не как runtime package solver.

### 7. Ecosystem — набор affordances и risks

Экосистема может предоставить:

- documentation/examples;
- libraries/components;
- editor/compiler/debugger/build support;
- testing/deployment/observability tools;
- standards/interoperability;
- community feedback;
- hiring/mentor visibility;
- maintenance/security channels.

Эти свойства не являются фиксированным multiplier.

Большая экосистема может:

- ускорить delivery;
- упростить learning;
- увеличить dependency surface;
- создать version fragmentation;
- повысить migration/support burden;
- облегчить hiring, но усилить competition.

### 8. Technology choice является contextual trade-off

Обычные подходы:

- использовать знакомую стабильную технологию;
- выбрать mainstream ecosystem;
- попробовать emerging technology;
- сохранить legacy context;
- мигрировать version band/technology;
- ограничить scope ради совместимости;
- добавить tooling/verification before delivery.

Project Engine разрешает технические последствия. Learning Engine разрешает освоение. Career использует market signals. Technology Context Engine только предоставляет валидный контекст и причины.

### 9. Историческая достоверность и provenance

#### Primary sources

Используются для:

- release dates;
- standard publication;
- support policy;
- official compatibility/lifecycle;
- first public availability.

#### Scoped adoption sources

Surveys, repository/platform statistics и expert radars допускаются только с сохранением:

- geography/platform/audience;
- sample and methodology;
- publication/observation period;
- limitations;
- distinction between usage, desire, recommendation and demand.

Один survey не создаёт universal popularity truth.

`mainstream` или `broad ecosystem` должны иметь:

- минимум два независимых source classes; или
- status `estimated/hypothesis` с явной uncertainty.

Expert recommendation не равна adoption. Repository activity не равна global professional usage. Job demand не равна technical suitability.

### 10. Local availability остаётся вымышленной проекцией

```text
global existence
→ globally usable platform/toolchain
→ fictional local diffusion
→ organization/source access
→ character practical access
```

Реальная дата релиза не означает, что технология мгновенно доступна персонажу в городе.

Low-access background обязан иметь alternative route:

- school/shared device;
- library/club;
- colleague/mentor;
- used equipment;
- employer-provided toolchain;
- later retry after infrastructure change.

Разница влияет на темп, context и историю, но не создаёт permanent technology ceiling.

### 11. Project context сохраняет semantic snapshot

Project/release/history records сохраняют:

- technology identity/family;
- version band;
- platform/toolchain profile;
- relevant ecosystem/support traits;
- compatibility constraints;
- rules/content version;
- trace/fingerprint.

Будущее обновление каталога не переписывает прошлую project truth или evidence.

Active project/draft требует exact-compatible technology context либо controlled migration/recovery.

### 12. AI-era tools

AI assistant является tool/ecosystem affordance, а не:

- языком программирования;
- universal skill;
- автоматическим multiplier;
- самостоятельным evidence provider.

Различаются режимы:

- search/explanation;
- completion;
- generation;
- diagnosis;
- review/verification;
- agentic execution.

Learning/Challenge/Project определяют фактический outcome и autonomy. Technology context определяет availability, integration, support и verification burden.

### 13. Casual-first baseline

Первый playable требует только:

- одну technology family;
- одну playable technology/version band;
- один platform/toolchain context;
- один ecosystem snapshot;
- один access route и один low-access fallback;
- одну compatibility/support limitation;
- один technology-informed learning/project choice;
- deterministic snapshot/resume;
- human-readable context explanation.

Он не требует полного исторического каталога, package graph, IDE inventory, десятков version bands или market simulation.

## Последствия

### Положительные

- технологическая история влияет на реальные решения, а не служит декорацией;
- новые технологии не становятся автоматическими upgrades;
- legacy остаётся профессионально значимым;
- Learning, Project и Career используют один согласованный context;
- historical facts отделены от fictional local diffusion;
- compatibility/support/market изменения не смешиваются в одну шкалу;
- сохранён casual-first UI;
- каталог может расширяться по мере реального gameplay.

### Отрицательные

- требуется provenance и source review;
- version-band boundaries требуют экспертного решения;
- необходимо тестировать cross-axis комбинации;
- active project/save compatibility становится чувствительной к semantic catalog changes;
- часть исторической доступности останется явно estimated.

### Отвергнутые альтернативы

#### Полный tech tree

Отвергнут: создаёт ложную линейность и dominant latest-tech path.

#### Каждая версия и библиотека

Отвергнуто: schema/content explosion без доказанной gameplay ценности.

#### Один popularity/ecosystem score

Отвергнуто: скрывает разные причины и создаёт универсальную оптимизацию.

#### Dynamic internet statistics

Отвергнуто: нарушает offline-first, determinism, provenance и reproducibility.

#### LLM-generated technology balance

Отвергнуто: authoritative context должен быть versioned, testable и source-backed.

## Инварианты

- Historical catalog owns global factual chronology; local content owns fictional diffusion.
- Technology Context Engine projects immutable context and does not mutate owner states.
- Technology identity/family/version/platform/ecosystem/familiarity/demand/support/access remain distinct.
- No universal technology, popularity, ecosystem or modernity score.
- Newer technology is not globally better.
- Version band exists only with current gameplay value.
- Ecosystem dimensions remain multi-axis and problem-specific.
- Adoption claims preserve source scope/methodology.
- Mainstream claims require triangulation or explicit estimated status.
- Real release does not imply immediate local/practical availability.
- Technology choice does not directly grant mastery, evidence or grade.
- Project/learning/career outcomes remain owned by their engines.
- Active context does not reroll after reload.
- Historical project/release/episode snapshots are not rewritten by catalog updates.
- Missing/changed active technology content requires exact compatibility, migration or recovery.
- Low-access path has fallback/retry and no permanent ceiling.
- AI tool use does not mint independent capability without provider evidence.
- No dynamic network fetch in authoritative simulation.

## MVP acceptance

ADR считается корректно реализованным, когда fixture 1990 года доказывает:

- technology exists globally before local use;
- local/practical access are separate;
- one technology context presents 3–5 understandable traits;
- familiar/stable and emerging/limited choices have real trade-offs;
- no exact version/package micromanagement;
- project outcome consumes context without Technology Engine owning the result;
- learning outcome changes familiarity only through Progression;
- low-access character reaches the same meaningful technology route through fallback;
- reload preserves context and choice;
- historical source change cannot silently rewrite committed history.