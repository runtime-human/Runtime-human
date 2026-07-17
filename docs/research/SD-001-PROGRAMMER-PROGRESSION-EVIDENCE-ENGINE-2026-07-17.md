# SD-001 — Programmer Progression & Evidence Engine

- **Дата:** 2026-07-17
- **Статус:** системный анализ, нормализованный в ADR-013 и профильных спецификациях
- **Область:** профессиональная прогрессия, skills, technologies, evidence, grade readiness, MonthRun, persistence, UI и balance
- **Источник канона:** `docs/game-design/PROGRAMMER-FIRST-DESIGN.md`

## Executive verdict

Programmer Progression & Evidence Engine является центральной подсистемой Runtime Human, но не должен владеть всеми профессиональными задачами, проектами, вакансиями, курсами и событиями.

Рекомендуемая архитектура:

```text
Education / Projects / Career / OSS / Company / Events
                        ↓
                 ExperienceEpisode
                        ↓
          Professional Progression Core
                        ↓
mastery / fluency / familiarity / evidence / readiness
                        ↓
             MonthRun atomic commit
```

Главные решения:

- Experience Providers владеют доменным результатом;
- Progression Core оценивает, чему персонаж научился и что доказал;
- learning, fluency и evidence считаются раздельно;
- grade является gate-based milestone, а не XP threshold;
- `ProfessionalGradeAward` authoritative;
- readiness и specialization являются projections;
- meaningful evidence append-only;
- routine practice агрегируется помесячно;
- transfer ускоряет learning, но не создаёт production evidence;
- short break не понижает grade и не стирает mastery.

## Главные риски

1. God-module progression, владеющий task/project/career lifecycle.
2. Evidence bureaucracy на каждую микрозадачу.
3. Grade как скрытый weighted score.
4. Дублирование базовых характеристик и skills.
5. Десятки почти одинаковых skill bars.
6. Одна формула, ошибочно смешивающая learning, помощь, результат и evidence.
7. Proficiency для каждой библиотеки/версии.
8. Автоматическое понижение Senior после перерыва.
9. Farming простых задач, провалов, mentoring и shallow breadth.
10. Слишком медленный early game без локальных capability milestones.

## Базовые характеристики

Рекомендовано оставить только:

- Reasoning Aptitude;
- Learning Adaptability.

Self-Organization становится тренируемой planning/delivery capability и current status. Communication становится профессиональным skill. Creativity/Curiosity/Persistence моделируются traits. Focus является current capacity.

Aptitude влияет на learning в ограниченном диапазоне и не создаёт permanent bad start.

## Skill graph

Рекомендуемый baseline ограничен 13 skills:

- Problem Solving;
- Programming;
- Debugging;
- Data Modelling;
- Testing & Quality;
- Codebase Evolution;
- Requirements & Design;
- Architecture;
- Delivery & Operations;
- Non-functional Engineering;
- Technical Communication;
- Review, Mentoring & Leadership;
- Community Stewardship.

Version control, incident handling, performance, security и research могут оставаться task facets до доказанной необходимости отдельной шкалы.

## ExperienceEpisode

Нормализованный episode должен содержать:

- provider/source;
- period;
- challenge profile;
- participation/autonomy/assistance;
- practice;
- outcome;
- feedback;
- applied skills/technologies;
- stable context fingerprint.

Provider отвечает за истинность outcome. Progression не пересчитывает release, bug или vacancy domain.

## Три расчёта

### Mastery

Зависит от challenge match, novelty, feedback, reflection, capacity и diminishing returns.

### Fluency/Familiarity

Зависят от регулярной практики, outcome stability, technology/version use и reacquisition.

### Evidence

Зависит от challenge band, completion, quality, autonomy, confidence, context novelty и anti-repeat.

Помощь может повысить learning и одновременно снизить autonomy claim. Провал может подтвердить debugging/recovery, но не delivery/quality.

## Evidence model

Используется claims-based schema:

```text
ProfessionalEvidenceEvent
└── EvidenceClaim[]
```

Каждый claim подтверждает только применимую dimension/skill/technology. Это лучше гигантского evidence object с обязательными impact/quality/scope для любого результата.

Meaningful events создаются редко; routine practice сворачивается в `MonthlyPracticeAggregate`.

Evidence ID детерминирован:

```text
hash(saveId, monthRunId, episodeId, outcomeOrdinal, rulesVersion)
```

## Grade model

Core dimensions:

- Craft;
- Complexity;
- Autonomy;
- Quality;
- Delivery/Ownership.

Profile dimensions:

- Depth;
- Breadth/Transfer;
- Leverage/Collaboration;
- Impact.

Grade требует floors, нескольких contexts, устойчивости и подходящего profile gate. Среднее значение dimensions не используется.

Capability bands:

```text
Observed → Guided → Routine → Independent → Complex → Systemic → Strategic → Frontier
```

Разделяются:

- `DemonstratedGradeReadiness` — всё устойчиво доказанное;
- `CurrentMarketReadiness` — recency, technology relevance и current fluency.

## Technology и transfer

Tier A/B/C сохраняется. Version band создаётся только для существенных ecosystem/compatibility changes.

Transfer является directed sparse integer graph, компилируемым до runtime. Он влияет на initial learning и reacquisition, но не создаёт evidence.

## Persistence

Authoritative snapshot:

- aptitudes;
- skill mastery/fluency;
- technology familiarity;
- professional focus;
- awarded grades.

Append-only:

- evidence events/claims;
- monthly practice aggregates;
- grade awards;
- migration records.

Derived:

- readiness;
- specialization profile;
- capability cards;
- indexes/summaries;
- reports.

## Vertical slice

Минимум января 1990:

- 2 aptitudes;
- 5 skills;
- 1 technology family;
- 1 hands-on activity;
- 1 technical challenge;
- 4 challenge bands;
- assisted/independent/partial/failure outcomes;
- mastery/fluency delta;
- first evidence claims;
- simple readiness summary;
- deterministic restart fixture.

## Red-team verdict

### Minimal viable model

5 skills, mastery/fluency, one technology, one episode/evidence flow.

### Recommended model

13 skills, 2 aptitudes, mastery/fluency/familiarity, claims-based evidence, gate grades, directed transfer, provider boundaries.

### Отклонённая overengineered model

30–40 skills, evidence за каждый день, Bayesian/IRT, LLM judge, proficiency каждой библиотеки, dynamic transfer graph, automatic grade decay и full endgame в первом implementation phase.

## Canon integration

- ADR-013 фиксирует authoritative ownership;
- `PROFESSIONAL-PROGRESSION-ENGINE.md` является нормативной спецификацией;
- domain, MonthRun, persistence, content, events, projects, UI и balance документы должны ссылаться на неё;
- coefficients остаются versioned rules и калибруются playtest/mass simulation.
