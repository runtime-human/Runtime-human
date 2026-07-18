# Programmer Career Balance

Нормативные источники:

- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Career Engine](../game-design/PROGRAMMER-CAREER-ENGINE.md);
- [Programmer Career UI](../ui/PROGRAMMER-CAREER-UI.md);
- [Balance Simulation](BALANCE-SIMULATION.md).

## Цель

Проверять не «реалистичность количества вакансий», а качество карьерных решений:

- понимает ли игрок различия возможностей;
- существует ли несколько жизнеспособных путей входа;
- не доминирует ли зарплата, referral, credential или job hopping;
- объяснимы ли hire/non-hire/promotion outcomes;
- сохраняется ли casual tempo;
- есть ли recovery после rejection, layoff, mismatch и break.

## 1. Базовые гипотезы MVP Casual

- обычный месяц показывает 0–1 blocking career decision;
- активный поиск показывает максимум 1–3 meaningful opportunities;
- выбор opportunity/approach занимает 10–20 секунд после чтения;
- игрок может объяснить главный trade-off без Details;
- первый no-offer не воспринимается как потеря progression;
- первая работа открывает новый gameplay context, а не только income;
- work routine агрегируется;
- один employer archetype не доминирует для всех backgrounds/intents;
- low-network/low-credential path остаётся достижимым;
- no-reroll/no-duplicate соблюдаются.

## 2. Основные метрики

### Comprehension

- `opportunity_comprehension_rate`;
- `offer_tradeoff_explanation_rate`;
- `title_grade_distinction_rate`;
- `rejection_cause_comprehension_rate`;
- `workplace_feedback_comprehension_rate`;
- `promotion_reason_comprehension_rate`.

### Tempo

- `ordinary_career_decision_seconds_p50/p90`;
- `blocking_career_decisions_per_month`;
- `opportunities_shown_per_search_month`;
- `routine_career_modals_per_month`;
- `months_to_first_meaningful_opportunity`;
- `months_to_first_job_by_background`.

### Diversity

- `career_intent_selection_distribution`;
- `employer_archetype_acceptance_distribution`;
- `hiring_approach_selection_distribution`;
- `offer_choice_distribution`;
- `opportunity_source_distribution`;
- `career_transition_distribution`.

### Dominance

- `salary_dominance_rate`;
- `referral_dominance_rate`;
- `credential_dominance_rate`;
- `mentorship_dominance_rate`;
- `job_hopping_dominance_rate`;
- `stay_put_dominance_rate`;
- `single_interview_approach_dominance_rate`.

### Recovery

- `rejection_recovery_months`;
- `layoff_reentry_months`;
- `performance_mismatch_recovery_months`;
- `break_reacquisition_months`;
- `path_block_without_visible_alternative_rate`.

### Determinism/exploit

- `opportunity_reroll_rate` must be 0;
- `interview_reroll_rate` must be 0;
- `duplicate_offer_rate` must be 0;
- `duplicate_salary_rate` must be 0;
- `duplicate_transition_rate` must be 0;
- `interview_evidence_farming_rate` must be 0.

## 3. Scenario matrix

Каждый balance corpus покрывает минимум:

### Background

- home computer / no home computer;
- strong mentor / no mentor;
- credential / no credential;
- strong portfolio / weak visibility;
- low income / stable household;
- interruption/break.

### Market

- high demand / low competition;
- high demand / high competition;
- low demand / credential-biased;
- portfolio-open;
- referral-heavy;
- employer training tolerance high/low.

### Employer

- small product team;
- large stable organization;
- service/contract team.

### Outcome

- standard offer;
- conditional offer;
- alternate role;
- rejection with feedback;
- employer cancellation;
- promotion delayed;
- layoff;
- performance dismissal;
- re-entry.

## 4. Career opportunity balance

Opportunity set должен содержать реальное различие минимум по двум измерениям.

Плохой набор:

```text
Vacancy A: salary 100
Vacancy B: salary 105
Vacancy C: salary 110
```

Хороший набор:

```text
A: сильное наставничество, ниже доход, широкий scope
B: стабильность, средний доход, узкий scope
C: portfolio continuation, без дохода, высокая автономность
```

### Gate

Если игрок выбирает opportunity почти только по salary, content/visual hierarchy считается неудачным, даже когда salary логично важен.

## 5. Hiring approach balance

Подход оценивается контекстно:

- relevance к роли;
- соответствие demonstrated story;
- assistance/autonomy semantics;
- cost/capacity;
- employer tolerance;
- uncertainty.

Не вводить rock-paper-scissors table, известную игроку после одного прохождения.

### Dominance gate

Один approach отклоняется, если он:

- лучший более чем в 60% несвязанных fixtures;
- не имеет meaningful cost;
- одновременно максимизирует offer, learning и trust;
- всегда безопаснее альтернатив.

Число 60% — тестовая гипотеза, не player-facing rule.

## 6. Referral/credential balance

Referral может:

- повысить chance opportunity surfacing;
- дать доступ к interview;
- улучшить information quality;
- сохранить contact после no-offer.

Referral не может:

- пропустить mandatory meaningful capability stage во всех employers;
- гарантировать offer;
- выдать grade/evidence;
- отменить hard role mismatch.

Credential может:

- открыть формальный channel;
- удовлетворить hard requirement;
- повысить signal confidence.

Credential не должен заменять project/capability evidence для technical autonomy.

### Equity gates

- no-credential path имеет хотя бы один viable first-job route;
- no-network path имеет public/project/community route;
- low-income start не блокируется неоплачиваемыми обязательными assessments;
- path-critical refusal объясняет alternative/retry condition.

## 7. Offer balance

Offer utility не сводится к одной authoritative формуле. Для simulation допускается diagnostic utility, но она не становится gameplay truth.

Diagnostic dimensions:

- income sufficiency;
- stability;
- mentorship;
- task/evidence opportunity;
- workload/capacity pressure;
- technology relevance;
- flexibility;
- growth.

### Failure gates

- highest salary выбран >75% во всех backgrounds;
- mentorship-first всегда доминирует;
- risky startup-like archetype всегда даёт больше progression без сопоставимого риска;
- stable employer всегда блокирует meaningful growth;
- uncertain condition не меняет решение и только добавляет текст.

Пороговые значения являются tuning hypotheses.

## 8. Employment balance

Обычная работа должна создавать:

- predictable routine;
- редкие meaningful situations;
- контекст для shared Project/Challenge/Learning engines;
- ясный feedback;
- иногда новый scope/transition.

Не должна создавать:

- обязательное ежемесячное нажатие «работать»;
- checklist performance chores;
- ежедневные tickets;
- постоянную необходимость менять employer ради progression.

### Work event pacing

Starting hypothesis:

- meaningful workplace challenge: 1 раз в 1–3 месяца в активном learning phase;
- organizational career decision: реже technical challenge;
- promotion/transition review: milestone/context driven, не фиксированный monthly roll;
- quiet month допустим и необходим.

## 9. Workplace trust balance

Trust dimensions меняются только при релевантном outcome.

Примеры:

- clean delivery повышает delivery/autonomy confidence;
- assisted success может повысить learning trajectory, но слабее autonomy;
- failure with early escalation может сохранить quality/reliability trust;
- hidden problem может снижать trust сильнее самого defect;
- team success без player contribution не повышает personal trust.

### Gate

Один failure не должен автоматически обнулять trust. Повторяемые pattern и response важнее бинарного outcome.

## 10. Promotion balance

Promotion проверяется отдельными причинами:

- ready + position available;
- ready + no position;
- not ready + inflated title;
- strong performance + salary adjustment only;
- lateral opportunity better than promotion;
- external move needed for scope.

### Failure gates

- tenure alone почти гарантирует promotion;
- grade award автоматически вызывает employer promotion;
- promotion автоматически выдаёт grade;
- external job change всегда быстрее/лучше;
- internal growth всегда дешевле и безопаснее без downside;
- management path является единственным high-level route.

## 11. Rejection and recovery balance

No-offer outcome обязан относиться к одному из buckets:

- capability gap;
- visible signal gap;
- context mismatch;
- hard access;
- competition/selectivity;
- employer cancellation/company cause;
- candidate withdrawal.

Recovery может быть:

- new project/evidence;
- learning opportunity;
- portfolio presentation;
- bounded/trial role;
- alternative employer;
- referral/community route;
- waiting for market condition;
- reacquisition after break.

### Gate

Не допускается invisible permanent blacklist или career soft lock без player-facing cause и alternative.

## 12. Labor market shocks

Recommended profile может менять opportunity rates и conditions через market events.

Правила:

- shock меняет context, не переписывает past history;
- layoffs не означают individual failure;
- market recovery происходит постепенно и объяснимо;
- одна эпоха/регион не задаёт универсальные правила;
- provenance required.

## 13. Monte Carlo / fixture simulation

Diagnostic simulation запускает deterministic cohorts по:

- backgrounds;
- intents;
- market profiles;
- employer archetypes;
- capability/signal combinations;
- interruption states.

Проверяются:

- reachability first job;
- route diversity;
- time distributions;
- dominance;
- recovery;
- no-reroll/idempotency;
- state growth.

Simulation не заменяет human playtest comprehension.

## 14. Human playtest questions

После first opportunity:

- Чем отличаются варианты?
- Почему эта возможность появилась?
- Что вы рискуете потерять?

После interview:

- Почему получен такой outcome?
- Это говорит о capability, signal или company cause?
- Что можно сделать дальше?

После offer:

- Почему выбран этот employer?
- Как работа изменит развитие и жизнь?

После workplace feedback:

- Что вам теперь доверяют?
- Что не изменилось?

После promotion/layoff:

- Изменился ли Professional Grade?
- Почему произошёл transition?

## 15. Exit criteria Career Slice

- не менее 80% игроков правильно объясняют главный trade-off;
- не менее 80% различают title и grade;
- не менее 80% отличают candidate gap от employer cancellation;
- median ordinary choice 10–20 секунд;
- salary не является единственным объяснением выбора;
- минимум два viable first-job routes;
- low-credential/no-network fixtures достигают meaningful opportunity;
- rejection имеет понятный next step;
- routine work не воспринимается как missed gameplay;
- player хочет продолжить после первого offer и первого рабочего месяца;
- no reroll/duplicate across restart.

Проценты являются starting playtest gates и могут меняться только с документированной причиной.

## 16. Deferred balance work

До доказанного спроса не требуется балансировать:

- global remote market;
- visas/relocation;
- detailed compensation;
- executive/Founder paths;
- recruiting other employees;
- office politics;
- multiple jobs;
- complete historical labor economics;
- advanced Company simulation.
