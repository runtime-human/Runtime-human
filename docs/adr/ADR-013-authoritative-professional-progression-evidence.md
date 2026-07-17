# ADR-013 — Авторитетная модель профессиональной прогрессии и evidence

- **Статус:** Accepted
- **Дата:** 2026-07-17
- **Решение владельца:** внедрить результаты SD-001 в документационный канон
- **Связанные ADR:** ADR-005, ADR-006, ADR-007, ADR-010
- **Связанные спецификации:** `docs/game-design/PROGRAMMER-FIRST-DESIGN.md`, `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`

## Контекст

Runtime Human является programmer-first симулятором. После принятия programmer-first канона стало необходимо определить авторитетную модель, которая связывает обучение, задачи, проекты, работу, open source и техническое лидерство с развитием персонажа.

До этого документа прогрессия была описана концептуально, но оставались архитектурные неопределённости:

- кто владеет профессиональными задачами и результатами;
- что является источником истины для mastery, fluency и технологии;
- как создаётся `ProfessionalEvidence`;
- является ли `GradeReadiness` authoritative state;
- как evidence переживает suspend/resume MonthRun;
- как избежать дублирования evidence после retry;
- как хранить долгую профессиональную историю без полного event sourcing;
- как отделить грейд от XP, должности, title, зарплаты и публичности.

Если один `Programmer Progression Engine` будет владеть задачами, проектами, курсами, карьерой и событиями, он станет god-module и нарушит принятые module boundaries.

## Решение

### 1. Разделить Experience Providers и Professional Progression Core

Experience Providers:

- Education;
- Project Engine;
- Career/Employment;
- Open Source;
- Company/Leadership;
- Event Engine.

Они владеют состоянием и результатами своего домена и передают нормализованный неизменяемый `ExperienceEpisode`.

Professional Progression Core:

- оценивает применение skills и technologies;
- обновляет mastery, fluency и technology familiarity;
- создаёт meaningful evidence либо monthly practice aggregate;
- вычисляет progression delta и explanations;
- строит rebuildable readiness projections.

Progression Core не пересчитывает доменную правду provider: он не решает повторно, успешен ли release, существовал ли bug или выполнена ли рабочая задача.

### 2. Принять разделение mastery, fluency, familiarity и recency

- `mastery` — устойчивое переносимое понимание; почти не деградирует;
- `fluency` — текущая скорость и уверенность; может постепенно снижаться после длительного неиспользования;
- `technology familiarity` — актуальное знание конкретной technology family/version band;
- `evidence recency` — производная актуальность доказательств для рынка и роли.

Краткий перерыв не понижает grade и не стирает mastery.

### 3. Evidence является append-only профессиональной историей

Значимый опыт материализуется как immutable `ProfessionalEvidenceEvent` с отдельными `EvidenceClaim`.

Повторяющаяся routine practice агрегируется как `MonthlyPracticeAggregate` и не создаёт отдельную запись на каждый день или микрозадачу.

Evidence обязательно содержит:

- deterministic evidence ID;
- period;
- source/context semantic snapshot;
- outcome;
- claims;
- assistance;
- anti-repeat key;
- rules/content/trace identifiers.

Evidence не удаляется молча при удалении content/mod definition. Tombstone или semantic snapshot сохраняют читаемость и auditability.

### 4. Grade award authoritative, readiness derived

`ProfessionalGradeAward` является авторитетным milestone и сохраняется в сейве.

`DemonstratedGradeReadiness`, `CurrentMarketReadiness`, capability cards и specialization profile являются rebuildable projections.

Professional grade:

- не является XP threshold;
- не равен title, position, role, company level, salary, reputation или fame;
- не понижается автоматически из-за временной потери fluency;
- требует gate-based проверки core dimensions, устойчивости и разнообразия evidence.

### 5. Progression расчёты разделяются

Нельзя одной формулой одновременно вычислять learning и evidence.

Минимум используются отдельные deterministic оценки:

- mastery gain;
- fluency/familiarity update;
- evidence claims.

Помощь mentor может повысить learning/feedback, но снижает autonomy evidence. Провал может дать debugging/recovery learning, но не подтверждает delivery/quality автоматически.

Все authoritative расчёты используют integer/fixed-point policy ADR-006.

### 6. Интеграция с MonthRun

Профессиональный pipeline включается в versioned MonthRun phases:

```text
provider commitments/outcomes
→ ExperienceEpisode materialization
→ progression assessment
→ draft evidence
→ skill/technology updates
→ readiness projections
→ invariants
→ atomic commit
```

Draft evidence хранится в pending MonthRun checkpoint и становится committed только вместе с итоговым snapshot/history.

Evidence ID формируется детерминированно из save/month run/episode/outcome/rules context. Duplicate resume/decision/commit не создаёт evidence повторно.

### 7. Persistence ownership

Authoritative snapshot хранит:

- aptitude profile;
- skill mastery/fluency;
- technology familiarity;
- professional focus;
- active provider references/continuity state;
- awarded grades.

Append-only history хранит:

- meaningful evidence events;
- monthly practice aggregates;
- grade awards;
- progression migration records.

Rebuildable projections:

- demonstrated readiness;
- current market readiness;
- specialization profile;
- evidence indexes/summaries;
- UI capability/read models.

Rust persistence service атомарно сохраняет snapshot и append-only progression records.

### 8. Technology transfer

Transfer является directed, sparse, versioned и предварительно компилируется content toolchain в integer edges.

Transfer ускоряет initial learning/reacquisition, но:

- не создаёт production evidence;
- не повышает grade напрямую;
- не заменяет практику в новой технологии.

### 9. Skill graph остаётся ограниченным

Baseline использует небольшой набор устойчивых skills и task facets. Не создаётся отдельная authoritative шкала для каждого subskill, библиотеки или Tier C технологии.

## Последствия

### Положительные

- programmer progression получает ясный источник истины;
- грейды невозможно свести к стажу или одному XP;
- помощь, провал и частичный результат моделируются корректнее;
- provider modules остаются независимыми;
- suspend/resume безопасен;
- UI может показывать novice capability и advanced evidence из одной модели;
- специализация и market readiness перестраиваются без переписывания истории;
- evidence остаётся объяснимым при migration/mod removal.

### Стоимость

- требуется отдельный progression domain package/module;
- save schema и migrations становятся сложнее;
- необходимо проектировать semantic snapshots и anti-farming policy;
- balance simulator должен проверять evidence diversity и time-to-grade;
- content providers должны реализовать `ExperienceEpisode` contract.

### Риски

- evidence может превратиться в performance-review bureaucracy;
- слишком много dimensions ухудшат UI и content production;
- неудачная агрегация сделает grade скрытым weighted score;
- ранняя реализация полного endgame scope приведёт к переусложнению.

Риски ограничиваются progressive disclosure, claims-based evidence, routine aggregates и vertical-slice scope.

## Отклонённые альтернативы

### Один общий XP

Отклонено: не различает сложность, автономность, качество и контекст.

### GradeReadiness как authoritative число

Отклонено: formula update или market change переписывали бы профессиональную историю.

### Полное event sourcing профессиональной жизни

Отклонено: текущий state не должен зависеть от воспроизведения десятилетий старых правил.

### Progression владеет task lifecycle

Отклонено: создаёт god-module и дублирует Project/Career/Education domains.

### Автоматическое понижение grade

Отклонено: перерыв снижает current readiness/fluency, но не отменяет ранее доказанное mastery.

### LLM judge для authoritative evidence

Отклонено: недетерминированно, требует backend/model dependency и затрудняет compatibility.

## Инварианты

- evidence всегда имеет source/context snapshot;
- transfer не создаёт production evidence;
- duplicate MonthRun/resume не дублирует evidence;
- partial outcome не подтверждает full delivery;
- помощь не обнуляет learning и не завышает autonomy;
- title/salary/fame не создают mastery;
- grade award не вычисляется одним weighted average;
- Tier C technology не получает отдельный authoritative state;
- readiness projections воспроизводимы из authoritative state/history;
- все authoritative числа integer/fixed-point;
- progression change входит в rules/save compatibility policy.

## Дальнейшая работа

- реализовать минимальный contract для vertical slice;
- создать schema/migration только после утверждения логической модели;
- откалибровать coefficients через deterministic fixtures и policy players;
- отложить Top Programmer и leadership evidence до соответствующих roadmap phases.
