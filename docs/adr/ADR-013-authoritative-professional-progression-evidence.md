---
title: "ADR-013 — Авторитетная модель профессиональной прогрессии и evidence"
type: adr
status: accepted
canon: true
depends_on: [ADR-005, ADR-006, ADR-007, ADR-010, ADR-015]
updated: 2026-07-18
---

# ADR-013 — Авторитетная модель профессиональной прогрессии и evidence

- **Статус:** Accepted
- **Дата:** 2026-07-17
- **Решение владельца:** внедрить результаты SD-001 в документационный канон с casual-first ограничениями ADR-015
- **Связанные ADR:** ADR-005, ADR-006, ADR-007, ADR-010, ADR-015
- **Связанные спецификации:** `docs/game-design/PROGRAMMER-FIRST-DESIGN.md`, `docs/game-design/CASUAL-SIMULATION-DESIGN.md`, `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`

## Контекст

Runtime Human является programmer-first симулятором. Профессиональное развитие должно связывать обучение, задачи, проекты, работу, open source и техническое лидерство с понятным ростом персонажа.

Нужно избежать двух крайностей:

- один общий XP, выдающий грейд за время;
- полноценный performance-review simulator с десятками evidence dimensions на основном экране.

Professional Progression Core не должен владеть задачами, проектами, курсами, карьерой и событиями одновременно, иначе он становится god-module.

ADR-015 дополнительно фиксирует, что правильная архитектурная граница не означает обязательную реализацию максимальной модели в Vertical Slice.

## Решение

### 1. Разделить Experience Providers и Professional Progression Core

Experience Providers:

- Education;
- Project Engine;
- Career/Employment;
- Open Source;
- Company/Leadership;
- Event Engine.

Они владеют результатами собственного домена и передают нормализованный immutable `ExperienceEpisode`.

Professional Progression Core:

- оценивает применение skills и technologies;
- обновляет mastery, fluency и technology familiarity;
- создаёт aggregated evidence/practice result;
- вычисляет progression delta и explanations;
- строит rebuildable readiness projections.

Progression Core не пересчитывает provider truth: он не решает повторно, выполнена ли задача, успешен ли release или существовал ли bug.

### 2. Разделить mastery, fluency, familiarity и recency

- `mastery` — устойчивое переносимое понимание; почти не деградирует;
- `fluency` — текущая скорость и уверенность; может снижаться после длительного неиспользования;
- `technology familiarity` — актуальная практическая близость к technology family/version;
- `evidence recency` — derived актуальность опыта для рынка и роли.

Краткий перерыв не понижает awarded grade и не стирает mastery.

### 3. Evidence защищает причинность, но не является основным UI

Meaningful professional outcome может создавать immutable `ProfessionalEvidenceEvent` с claims. Routine practice агрегируется помесячно.

Evidence обязательно имеет:

- deterministic ID;
- period;
- semantic source/context snapshot;
- outcome;
- assistance/participation;
- reason/claim summary;
- rules/content/trace identifiers.

В **MVP Casual**:

- один meaningful outcome создаёт один aggregated evidence summary;
- raw claims могут храниться минимально либо существовать только в deterministic fixture;
- отдельный Evidence Timeline не обязателен;
- игрок видит human-readable capability explanation;
- routine practice не создаёт карточки.

В **Recommended/Extended** допускаются claims, evidence browser, context diversity и detailed diagnostics после playtest gate ADR-015.

Evidence не удаляется молча при удалении content/mod definition; semantic snapshot/tombstone сохраняет читаемость истории.

### 4. Grade award authoritative, readiness derived

`ProfessionalGradeAward` является authoritative milestone.

`DemonstratedGradeReadiness`, `CurrentMarketReadiness`, capability cards и specialization profile являются rebuildable projections.

Professional grade:

- не является XP threshold;
- не равен title, position, role, salary, reputation или fame;
- не понижается автоматически из-за временной потери fluency;
- требует capability gates, устойчивости и нескольких contexts.

В normal UI readiness показывается как четыре понятные области:

- техническая база;
- самостоятельность;
- сложность решённых задач;
- надёжность результата.

Detailed gate matrix не является обязательной частью MVP.

### 5. Learning и evidence рассчитываются отдельно

Нельзя одной формулой вычислять learning и доказанную capability.

Минимально разделяются:

- mastery gain;
- fluency/familiarity update;
- evidence/readiness effect.

Помощь mentor может улучшить learning, но уменьшить evidence самостоятельности. Провал может дать debugging/recovery learning, но не подтверждает delivery/quality автоматически.

Все authoritative расчёты используют integer/fixed-point policy ADR-006.

### 6. Интеграция с MonthRun

```text
provider outcome
→ ExperienceEpisode
→ progression assessment
→ draft professional result
→ skill/technology update
→ readiness projection
→ invariants
→ atomic commit
```

Draft result хранится в pending MonthRun checkpoint и становится committed вместе с итоговым snapshot/history.

IDs формируются детерминированно. Duplicate resume/decision/commit не создаёт progression/evidence повторно.

### 7. Persistence ownership

Authoritative snapshot хранит только уже используемые gameplay поля:

- aptitude profile;
- active skill mastery/fluency;
- active technology familiarity;
- professional focus;
- awarded grades.

Append-only history хранит:

- meaningful aggregated evidence events;
- monthly practice aggregates;
- grade awards;
- progression migration records.

Rebuildable:

- readiness;
- current market readiness;
- specialization profile;
- evidence indexes/summaries;
- UI read models.

Неиспользуемые future dimensions не добавляются в schema заранее.

### 8. Technology transfer

Transfer directed, sparse and versioned.

Он ускоряет learning/reacquisition, но:

- не создаёт production evidence;
- не повышает grade напрямую;
- не заменяет практику в новой технологии.

Full transfer matrix не обязательна для Vertical Slice; достаточно одного family relationship/fixture.

### 9. Skill graph остаётся ограниченным и раскрывается по этапам

Baseline использует небольшой набор устойчивых skills и task facets.

- MVP показывает 3–5 skills текущего этапа;
- Recommended постепенно открывает дополнительные skills;
- Extended может использовать полный graph;
- отдельная authoritative шкала не создаётся для каждого subskill, tool или Tier C technology.

## Реализационные профили

### MVP Casual

- 3–5 skills;
- одна technology proficiency;
- capability phrase;
- aggregated professional result;
- простой readiness status;
- no evidence browser;
- no complex grade profiles;
- no Senior/leadership model.

### Recommended

- более широкий skill graph;
- Intern/Junior grade gates;
- context diversity;
- multiple technology families;
- Details mode.

### Extended

- advanced evidence claims/browser;
- multiple professional profiles;
- Senior/leadership/Top Programmer;
- long-term market readiness and historical compaction.

Extended profile не является обязательством раннего roadmap.

## Последствия

### Положительные

- грейд нельзя свести к стажу или XP;
- provider modules остаются независимыми;
- помощь, partial outcome и failure моделируются правдоподобно;
- suspend/resume безопасен;
- normal UI остаётся казуальным;
- schema развивается вместе с реально реализованным gameplay.

### Стоимость

- требуется progression domain boundary;
- нужны save/migration rules для добавляемых позднее полей;
- content providers реализуют `ExperienceEpisode`;
- balance simulator проверяет farming и time-to-grade.

### Риски

- evidence может стать бюрократией;
- чрезмерное упрощение может скрыть причинность;
- late expansion потребует migrations;
- readiness может незаметно стать weighted score.

Риски ограничиваются ADR-015, capability language, aggregated outcomes, Details-on-demand и playtest gate.

## Отклонённые альтернативы

### Один общий XP

Отклонено: не различает сложность, автономность, качество и контекст.

### GradeReadiness как authoritative число

Отклонено: formula update переписывала бы профессиональную историю.

### Полное event sourcing профессиональной жизни

Отклонено: current state не должен зависеть от replay десятилетий старых rules.

### Progression владеет task lifecycle

Отклонено: создаёт god-module.

### Автоматическое понижение grade

Отклонено: перерыв влияет на fluency/market readiness, а не отменяет доказанное mastery.

### Полная evidence matrix в MVP

Отклонено ADR-015: высокая реализационная и UX-стоимость без доказанной потребности.

### LLM judge authoritative evidence

Отклонено: недетерминированно и создаёт backend/model dependency.

## Инварианты

- provider outcome и progression ownership разделены;
- evidence всегда traceable к source/context;
- transfer не создаёт production evidence;
- duplicate MonthRun не дублирует result/evidence;
- partial outcome не подтверждает full delivery;
- помощь не обнуляет learning и не завышает autonomy;
- title/salary/fame не создают mastery;
- awarded grade не вычисляется одним weighted average;
- readiness rebuildable;
- normal mode не требует evidence terminology;
- future fields не добавляются без текущего gameplay;
- all authoritative arithmetic integer/fixed-point.

## Дальнейшая работа

- реализовать только MVP Casual contract для Vertical Slice;
- калибровать learning/readiness через fixtures и playtest;
- добавлять claims/details по наблюдаемой потребности;
- отложить Senior/leadership/Top Programmer до соответствующей roadmap phase.
