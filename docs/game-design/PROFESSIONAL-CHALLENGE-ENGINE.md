---
title: "PROFESSIONAL-CHALLENGE-ENGINE"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Professional Challenge Engine

## Статус

Нормативная межсистемная спецификация.

Основание:

- [ADR-016](../adr/ADR-016-authoritative-professional-challenge-model.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md).

## 1. Назначение

Подсистема превращает профессиональный контекст в один понятный и причинный игровой выбор:

```text
Technical Situation
→ Player Approach
→ deterministic outcome
→ provider application
→ ExperienceEpisode
→ progression/evidence
→ capability explanation
→ next challenge
```

Она отвечает на вопросы игрока:

1. В чём техническая проблема?
2. Почему она сложна именно сейчас?
3. Какие подходы доступны?
4. Какую цену имеет каждый подход?
5. Почему получился этот результат?
6. Чему персонаж научился?
7. Какой следующий тип задачи стал доступен?

## 2. Boundary map

```text
Education / Projects / Career / OSS / Company / Events
                         │
                         ▼
              ProfessionalChallengeRequest
                         │
                         ▼
              Professional Challenge Engine
               ├─ validation
               ├─ approach resolution
               ├─ complication/outcome
               └─ reason codes
                         │
                         ▼
              ProfessionalChallengeOutcome
                ├───────────────┐
                ▼               ▼
        Provider application   ExperienceEpisode
                │               │
                ▼               ▼
        Provider state      Progression Core
```

Challenge Engine не владеет lifecycle проекта, курса, работы, вакансии, компании или сообщества. Он не меняет `ProjectState`, skills, technology familiarity, evidence или grade напрямую.

## 3. Реализационные профили

### 3.1. MVP Casual

Обязательно:

- 1 hand-authored `diagnose` situation;
- 4 player approaches;
- 1 realized complication;
- 4 outcome variants;
- human-readable forecast и result explanation;
- deterministic suspend/resume;
- Project provider application;
- one `ExperienceEpisode` mapping;
- one capability explanation.

Не обязательно:

- все шесть archetypes;
- dynamic composition;
- multi-stage incidents;
- skill-unlocked hidden branches;
- challenge history browser;
- generic rule DSL;
- LLM generation/judging.

### 3.2. Recommended

После first-year playtest:

- все шесть archetypes;
- несколько contexts на archetype;
- skills/technology, открывающие новые approaches;
- approach repetition control;
- Education/Project/Career providers;
- Intern/Junior capability milestones;
- Details mode;
- validated composition из ограниченных частей.

### 3.3. Extended

Поздние системы:

- systemic/strategic/frontier situations;
- multi-stage incidents/recovery;
- team contribution и delegation;
- architecture review/negotiation;
- company/portfolio context;
- advanced challenge history;
- long-term authored/systemic arcs.

## 4. Терминология

| Понятие | Значение | Player-facing в MVP |
|---|---|---:|
| Technical Situation | конкретная профессиональная проблема и контекст | Да |
| Challenge Archetype | общий вид деятельности | Обычно нет |
| Challenge Cause | причина сложности | Да, максимум две |
| Player Approach | способ действия/trade-off | Да |
| Complication | realized uncertainty, влияющая на attempt | Через result |
| Outcome | технический результат attempt | Да |
| Reason Code | детерминированная причина outcome | Через explanation |
| Provider Effect | предлагаемое изменение provider domain | Нет напрямую |
| Milestone Candidate | возможное новое capability | Через Progression |

## 5. Challenge archetypes

### `build`

Создать или расширить работающий результат: первая программа, feature, prototype, tool.

### `diagnose`

Понять причину ошибки или неизвестного поведения: reproduce, isolate, inspect, test hypothesis.

### `improve`

Повысить качество или изменить структуру: refactoring, tests, maintainability, performance, usability.

### `integrate`

Соединить технологии, данные или части системы: library, migration, format, module, external interface.

### `operate`

Выпустить, восстановить или поддержать: release, deployment, incident, data recovery, production fix.

### `explain-and-lead`

Усилить других: review, mentoring, design alignment, technical direction, delegation.

Архетипы не создают отдельные UI/mini-game автоматически.

## 6. Technical Situation

MVP contract:

```ts
type TechnicalSituation = Readonly<{
  id: TechnicalSituationId;
  templateId: TechnicalSituationTemplateId;
  templateVersion: ContentVersion;
  provider: ExperienceProviderKind;
  source: ExperienceSourceRef;
  archetype: ProfessionalChallengeArchetype;
  title: LocalizationKey;
  summary: LocalizationKey;
  goal: LocalizationKey;
  causes: readonly ChallengeCauseId[];
  stakes: CasualStakeBand;
  approaches: readonly ProfessionalApproachOption[];
  contextFingerprint: ContextFingerprint;
  providerRevision: ProviderRevision;
}>;
```

MVP показывает максимум две причины сложности. Дополнительные facets являются internal tags/reason inputs.

## 7. Approaches

```ts
type ProfessionalApproachOption = Readonly<{
  id: ProfessionalApproachId;
  label: LocalizationKey;
  forecast: LocalizationKey;
  tradeOffs: readonly LocalizationKey[];
  availability: ApproachAvailability;
}>;
```

Baseline vocabulary:

- `investigate-first`;
- `implement-fast`;
- `prototype`;
- `ask-for-help`;
- `reduce-scope`;
- `strengthen-quality`;
- `defer-or-recover`.

Content template использует только релевантные 2–4 options и может добавить context-specific approach.

### Правила

- подход не показывает точный outcome score;
- option wording объясняет направление trade-off;
- unavailable option объясняет условие, если это полезно;
- отсутствие skill не должно создавать тупик;
- unlocked approach даёт новый способ, а не гарантированный success;
- одна и та же option не имеет универсального bonus.

## 8. Challenge causes

Baseline IDs:

- `unfamiliar-technology`;
- `unclear-requirements`;
- `legacy-code`;
- `weak-documentation`;
- `deadline-pressure`;
- `integration-risk`;
- `high-consequence`;
- `limited-observability`;
- `coordination`;
- `insufficient-capacity`.

Normal mode переводит их в plain language.

## 9. Outcome model

```ts
type ProfessionalChallengeOutcome = Readonly<{
  id: ProfessionalChallengeOutcomeId;
  situationId: TechnicalSituationId;
  selectedApproachId: ProfessionalApproachId;
  outcomeClass: ProfessionalOutcomeClass;
  completion: CasualCompletionBand;
  quality: CasualOutcomeQualityBand;
  autonomy: ParticipationKind;
  compromise?: ChallengeCompromiseId;
  complication?: ChallengeComplicationId;
  providerEffects: readonly ProviderEffectProposal[];
  episodeFacts: ExperienceEpisodeFacts;
  reasonCodes: readonly ChallengeReasonCode[];
  milestoneCandidate?: CapabilityMilestoneId;
  rulesVersion: RulesVersion;
  traceHash: TraceHash;
}>;
```

Outcome classes:

- `clean-success`;
- `success-with-compromise`;
- `partial-progress`;
- `failed-with-learning`;
- `recovered`.

Challenge Engine возвращает proposals. Provider валидирует и применяет только effects своего domain.

## 10. Resolution pipeline

```text
validate request/provider revision
→ load situation/template snapshot
→ validate approach availability
→ load realized complication/RNG trace
→ evaluate context + approach + current capabilities
→ resolve outcome class/bands
→ build reason codes
→ build provider effects proposal
→ build episode facts
→ persist provisional result
```

### Inputs

- situation snapshot;
- selected approach;
- relevant capability snapshot;
- technology familiarity status;
- participation/help availability;
- current capacity/status;
- provider constraints;
- realized complication;
- versioned rules.

### Rules

- skills modify options, risk, forecast and recovery, not a single universal chance;
- assistance may improve learning/outcome but reduces autonomy claim;
- easy repeated context has reduced evidence value;
- failure may create diagnosis/recovery learning but not full delivery;
- provider revision mismatch requires revalidation/recovery, not silent application;
- no reroll after decision is visible.

## 11. Player-facing result

Normal result answers:

```text
Что получилось?
Почему?
Что изменилось в проекте/работе?
Чему персонаж научился?
Какой следующий шаг?
```

Example:

```text
Отладка улучшилась

Вы самостоятельно нашли причину ошибки во вводе.
Помогло: вы сначала воспроизвели проблему и проверили данные.
Цена решения: выпуск занял больше времени.

Следующий шаг: похожая ошибка, затрагивающая несколько частей программы.
```

Не обязательны слова `reason code`, `evidence`, `mastery` или точные проценты.

## 12. Capability milestones

Challenge Engine создаёт candidate, Progression Core подтверждает milestone.

MVP candidate:

- `debug-simple-input-independently`.

Long-term examples:

- modify a known example;
- complete a bounded task with review;
- diagnose an unfamiliar component;
- own a feature end-to-end;
- choose a systemic trade-off;
- improve others through review/mentoring.

Один случайный success не обязан подтверждать устойчивую capability.

## 13. Content authoring

Template обязан содержать:

- clear goal;
- concrete context;
- 1–2 visible challenge causes;
- 2–4 genuinely different approaches;
- forecast direction;
- valid outcome set;
- provider effect mappings;
- reason-code mappings;
- recovery/next-step path;
- repetition fingerprint;
- RU localization and long-text fixture.

Validation отклоняет template, если:

- одна option доминирует во всех declared contexts;
- choice требует знания синтаксиса/API без объяснения;
- failure не имеет next step;
- content напрямую меняет skills/grade/project state;
- partial/assisted result описан как full independent success;
- wording раскрывает скрытый exact result;
- stable IDs/version snapshots отсутствуют.

## 14. MonthRun и persistence

До decision сохраняются:

- situation snapshot/fingerprint;
- approach IDs/content versions;
- provider revision;
- realized complication;
- RNG/trace/rules fingerprints.

После answer сохраняются:

- selected approach;
- provisional outcome;
- provider application draft;
- episode facts;
- explanation payload.

Duplicate answer/resume не создаёт второй outcome, provider commit или `ExperienceEpisode`.

## 15. Balance

MVP измеряет:

- time to understand situation;
- choice time;
- correct prediction of trade-off direction;
- approach selection distribution;
- outcome distribution;
- causal report comprehension;
- dominant approach rate;
- recovery reachability;
- no reroll/duplicate;
- desire to continue.

Recommended дополнительно:

- archetype/context repetition;
- unlocked approach use;
- milestone cadence;
- repeated easy-context farming;
- path diversity;
- quiet-month rhythm.

## 16. Vertical Slice

January 1990:

- `diagnose` invalid-input situation;
- four approaches: independent investigation, help, reduced scope, defer;
- one deterministic complication;
- clean/compromise/partial/failure fixtures;
- Project provider application to `input-errors` Work Package;
- one `ExperienceEpisode`;
- one capability explanation;
- February next challenge;
- close/restart at decision and after provisional outcome.

## 17. Deferred

- generic challenge DSL;
- dynamic AI generation/judge;
- full archetype corpus;
- multi-stage incidents;
- team negotiation/delegation;
- advanced numeric matrix;
- challenge history dashboard;
- systemic/strategic/frontier content;
- automatic version-level technology quizzes.

## 18. Invariants

- situation is concrete, not a generic skill button;
- ordinary challenge has 2–4 meaningful approaches;
- no universal best approach;
- challenge does not mutate provider/progression state directly;
- provider outcome and progression remain separate;
- capability milestone belongs to Progression;
- failure has learning/recovery without false delivery;
- normal UI uses plain language;
- visible decision has stable outcome after reload;
- new complexity requires current gameplay/playtest evidence.

## 19. Definition of Done

MVP готов, когда:

- player explains goal/problem;
- chooses within 10–20 seconds;
- predicts trade-off direction;
- options feel like approaches, not correct/wrong answer;
- result explains at least two causal factors;
- Project/Progression boundaries are preserved;
- assisted/partial/failure semantics are correct;
- reload/duplicate input is deterministic/idempotent;
- no obvious globally dominant approach;
- majority of playtesters wants the next challenge.
