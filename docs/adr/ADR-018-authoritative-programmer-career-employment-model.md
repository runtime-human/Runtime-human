# ADR-018 — Авторитетная модель карьеры программиста, найма и занятости

- **Статус:** Accepted
- **Дата:** 2026-07-18
- **Решение владельца:** карьера моделируется через ограниченный набор профессиональных возможностей, причинный отбор, многомерное предложение, рабочий контекст, доверие работодателя и переходы; title, должность и рынок не заменяют Professional Grade и evidence
- **Связанные ADR:** ADR-005, ADR-007, ADR-009, ADR-010, ADR-013, ADR-014, ADR-015, ADR-016, ADR-017
- **Связанные спецификации:** `docs/game-design/PROGRAMMER-CAREER-ENGINE.md`, `docs/game-design/CAREER-SYSTEM.md`, `docs/ui/PROGRAMMER-CAREER-UI.md`, `docs/simulation/PROGRAMMER-CAREER-BALANCE.md`, `docs/content/PROGRAMMER-CAREER-CONTENT.md`

## Контекст

Runtime Human уже разделяет:

- профессиональный outcome и Progression Core;
- Professional Grade, readiness, mastery, fluency, familiarity и evidence;
- техническую ситуацию и выбор подхода;
- Project technical truth и организационный контекст;
- обучение, assistance и самостоятельное применение;
- casual UI и глубокую внутреннюю модель.

Без отдельной карьерной модели следующий этап легко вырождается в одну из двух крайностей:

```text
вакансия
→ проверка числового skill requirement
→ работа
→ зарплата
→ автоматическое повышение через N месяцев
```

или:

```text
сотни вакансий
→ ручная отправка резюме
→ многоэтапные интервью
→ employee/performance микроменеджмент
→ office-politics simulator
```

Обе модели противоречат programmer-first и casual-first канону. Первая делает карьеру плоской оболочкой над progression. Вторая превращает игру в HR/management simulator.

## Решение

### 1. Ввести Programmer Career Engine

Центральная цепочка:

```text
professional truth
→ market signal projection
→ available Career Opportunities
→ player Career Intent / strategy
→ Hiring Process
→ Offer or explained non-offer
→ Employment Context
→ workplace challenges, learning and projects
→ employer trust / organizational outcome
→ Career Transition
```

Career Engine владеет рынком возможностей, отбором, предложением, занятостью, доверием работодателя и карьерными переходами. Он не пересчитывает технический результат, обучение или профессиональный грейд.

### 2. Разделить ownership

#### Professional Progression Core

Владеет:

- awarded Professional Grade;
- grade readiness;
- mastery, fluency и technology familiarity;
- professional capabilities;
- evidence и ExperienceEpisode assessment.

Не знает, наняла ли компания персонажа, какой title выдала и какой salary предложила.

#### Career Engine

Владеет:

- `CareerOpportunity` и opportunity lifecycle;
- search focus / career intent;
- hiring stages и employer decision;
- `EmploymentOffer`;
- `EmploymentPosition`;
- workplace expectations и employer projections;
- workplace trust;
- promotion, lateral move, voluntary exit, dismissal, layoff и re-entry;
- career history и market-facing signal history.

#### Company Engine

В Recommended/Extended профиле владеет:

- teams и organizational structure;
- budget, payroll и headcount truth;
- company portfolio и strategic priorities;
- manager assignments;
- restructuring, closure и company-level hiring demand.

Career Engine получает typed company signals. Он не дублирует CompanyState.

#### Project Engine

Владеет technical project truth, Work Packages, quality, debt, defects, releases и contribution. Career передаёт constraints/expectations и получает contribution/outcome summaries.

#### Professional Challenge Engine

Разрешает meaningful interview/workplace technical situations. Career не создаёт отдельный interview skill-check engine.

#### Programmer Learning Engine

Разрешает onboarding, mentorship, preparation и reacquisition как learning opportunities. Career не выдаёт learning/mastery напрямую.

#### Life/Capacity/Economy owners

Владеют time capacity, health, household, costs, relocation constraints и фактическим движением денег. Career предоставляет employment commitment и compensation contract.

### 3. Разделить Grade, Position, Title, Role Fit и Trust

Нормативно различаются:

```text
Professional Grade
Grade Readiness
Market Competitiveness
Employer Role Fit
Employment Position / Title
Workplace Trust
```

Допустимы состояния:

- Middle capability в Junior position;
- inflated Senior title без Senior grade;
- сильный generalist с низкой familiarity в конкретном stack;
- сохранённый grade после перерыва при сниженной market readiness;
- расширенная ответственность без формального повышения;
- lateral transition в новую specialization.

Запрещено:

```text
JobTitle == ProfessionalGrade
```

и:

```text
monthsEmployed >= threshold → grade award
```

### 4. Career Opportunity является центральной единицей

Вакансия — только один источник возможности. Baseline sources:

- public vacancy;
- school/university/community channel;
- mentor or peer referral;
- invitation after project/open-source outcome;
- recruiter contact;
- client/freelance opportunity;
- internal transfer;
- former employer return path.

Opportunity хранит employer archetype, role family, expected scope, employment type, visible conditions, uncertain conditions, access requirements, expected signals, selection plan, market context и expiry.

Источник возможности меняет доступ, information quality и starting trust, но не гарантирует hire.

### 5. Требования разделяются по семантике

Career content не использует одну числовую таблицу `skill >= N`.

Требования классифицируются:

- hard access/legal/schedule/location requirements;
- demonstrated capability expectations;
- context/technology familiarity;
- market-visible signals;
- trainable gaps;
- employer preferences.

Отсутствие familiarity не равно отсутствию capability. Credential не равен evidence. Referral не равен competence.

### 6. Работодатель видит сигналы, а не authoritative professional state

Employer projection строится из доступных сигналов:

- education/credential;
- previous position/title;
- completed/released projects;
- ExperienceEpisode-derived portfolio stories;
- recommendations/referrals;
- interview/work-sample outcomes;
- reputation and prior employer history.

Работодатель не читает hidden mastery или exact grade readiness. Его `EmployerRoleFitProjection` является deterministic, bounded и explainable, но может быть неполным или ошибочным.

### 7. Job search является агрегированной кампанией

Игрок выбирает устойчивый `CareerIntent`, например:

- первая доступная профессиональная работа;
- сильное наставничество;
- нужная specialization/technology;
- высокий доход;
- стабильность;
- гибкость/remote;
- portfolio-first;
- network/referral-first;
- осторожный поиск без увольнения.

Routine browsing, obvious mismatches, repeated contacts и обычные отказы агрегируются. Обычный месяц показывает максимум 1–3 meaningful opportunities.

Нет application spam, ручной обработки десятков вакансий или обязательного resume editor в baseline.

### 8. Hiring Process использует job-related situations

Baseline hiring process содержит 1–2 meaningful stages:

- portfolio/project discussion;
- structured behavioral/situational interview;
- bounded work sample;
- manager/team conversation;
- offer discussion.

Technical situation делегируется Professional Challenge Engine. Interview outcome может создать learning/reflection, но не production evidence и не самостоятельную capability без подходящего реального outcome.

No fully random rejection. No syntax trivia, mandatory leetcode mini-game, free-text LLM judge или full coding IDE в baseline.

### 9. Hiring outcome не бинарен

Допустимые outcomes:

- strong offer;
- standard offer;
- conditional/trial/internship offer;
- alternate role;
- continue after preparation;
- talent-pool/contact retention;
- rejection with feedback;
- rejection without feedback;
- candidate withdrawal;
- employer cancellation.

Reason codes разделяют candidate capability, signal weakness, context mismatch, market/company cause и process cancellation.

### 10. Offer многомерный и частично неопределённый

Offer/context может включать:

- compensation;
- stability;
- mentorship/feedback;
- task quality and scope;
- technology relevance;
- workload;
- autonomy;
- growth opportunity;
- location/flexibility;
- values/process fit.

Normal UI показывает 4–6 наиболее значимых характеристик. Exact hidden formula и полная CompanyState не раскрываются. Некоторые условия остаются uncertain до интервью, probation или первых месяцев.

### 11. Employment является автоматическим commitment

После принятия offer работа автоматически:

- занимает capacity;
- создаёт income contract;
- предоставляет workplace project/challenge/learning contexts;
- поддерживает routine work;
- формирует employer expectations и feedback;
- создаёт organizational consequences.

Игрок не нажимает «работать» каждый месяц и не управляет task/hour schedule.

Обычный рабочий месяц имеет 0–1 blocking professional decision. Routine meetings, small fixes, ordinary review и salary aggregate.

### 12. Performance не является одной шкалой

Запрещён authoritative `PerformanceScore`.

Employer projections разделяются минимум на:

- delivery confidence;
- autonomy confidence;
- quality confidence;
- collaboration confidence;
- growth trajectory;
- role fit.

Normal UI выражает их причинным текстом и bounded bands, а не процентами.

### 13. Workplace Trust означает разрешённый scope

`WorkplaceTrust` отвечает на вопрос, какой scope/автономность работодатель готов поручить персонажу.

Trust зависит от:

- предсказуемого delivery;
- честной эскалации риска;
- recovery после ошибки;
- review/mentoring contribution;
- принятия ответственности;
- повторяемой reliability.

Trust не равен дружбе, NPC relationship, grade или loyalty meter. Одна failure не разрушает trust автоматически; учитываются причина, disclosure и recovery.

### 14. Promotion является организационным решением

Promotion possibility учитывает:

```text
professional readiness
+ sustained workplace evidence
+ workplace trust
+ available scope/position
+ manager sponsorship / employer policy
+ company budget/state
```

Возможны:

- title + compensation promotion;
- scope expansion without title;
- salary adjustment without promotion;
- lateral transfer;
- specialization transition;
- management path offer;
- delayed promotion;
- denial with next-review condition;
- external move as the only available growth path.

Employer promotion не создаёт Professional Grade Award. Новый scope создаёт возможности для evidence.

### 15. Увольнение и перерыв сохраняют профессиональную историю

Причина transition хранится семантически:

- voluntary exit;
- contract end;
- layoff;
- company closure;
- reorganization;
- role mismatch;
- performance dismissal;
- misconduct;
- health/life interruption;
- burnout.

Layoff/company closure не уменьшают grade. Performance dismissal не стирает mastery, но может ухудшить employer signals для похожих ролей до recovery evidence.

Перерыв может снизить fluency, technology familiarity и market visibility, но не автоматически стирает awarded grade/history.

### 16. Labor Market является компактным контекстом

MVP не симулирует тысячи работодателей/кандидатов. `LaborMarketProfile` задаётся по era, region, industry и role family и влияет на:

- opportunity frequency;
- demand/competition/selectivity;
- credential bias;
- portfolio openness;
- referral leverage;
- compensation pressure;
- stability;
- remote reach;
- common selection patterns;
- trainable-gap tolerance.

Исторические и региональные параметры имеют provenance. Employers остаются fictional.

### 17. Casual-first baseline

Первый career playable требует только:

- один historical/region market profile;
- три employer archetypes;
- 2–3 opportunity sources;
- один Career Intent;
- максимум три surfaced opportunities;
- один role family;
- 1–2 meaningful hiring stages;
- один interview challenge;
- одно offer comparison;
- одну active Employment Position;
- simple workplace trust bands;
- routine work aggregation;
- один work challenge;
- один rejection/recovery path;
- deterministic suspend/resume/no-reroll.

Не требуются Company simulation, global labor market, management path, detailed contracts, office politics, employee schedules или multiple simultaneous jobs.

## Последствия

### Положительные

- карьера становится продолжением programmer-first gameplay;
- first job, promotion и job change основаны на истории способностей и решений;
- title/salary не подменяют профессиональную правду;
- разные работодатели создают разные технические и жизненные контексты;
- rejection, layoff и interruption имеют объяснимое recovery;
- shared Project/Challenge/Learning/Progression engines используются повторно;
- casual UI не превращается в job-board CRM.

### Отрицательные

- требуется отдельная projection-модель между professional truth и employer signals;
- content должен описывать meaningful differences работодателей и opportunities;
- historical labor-market catalog требует provenance;
- причины non-offer/promotion должны быть тщательно нормализованы;
- atomic MonthRun затрагивает Career, Project, Learning, Progression и Economy contracts.

## Отклонённые альтернативы

### Career как список вакансий со skill thresholds

Отклонено: превращает историю в stat gate и раскрывает скрытую оптимизацию.

### Title автоматически равен grade

Отклонено: смешивает employer convention и профессиональную capability.

### Promotion по tenure

Отклонено: награждает ожидание вместо sustained evidence и scope.

### Полная Company/HR simulation в Phase 3

Отклонено: преждевременная сложность и employee micromanagement.

### Полностью случайный рынок и интервью

Отклонено: разрушает причинность и стимулирует reload.

### Реальный coding test/IDE

Отклонено: меняет жанр, создаёт accessibility/localization burden и проверяет игрока вместо персонажа.

### Универсальная шкала performance

Отклонено: скрывает различия delivery/autonomy/quality/collaboration и создаёт grind.

## Инварианты

- Career не меняет mastery, evidence или grade напрямую.
- Career не дублирует ProjectState или CompanyState.
- Grade, title, position, role fit и workplace trust различны.
- Employer видит signals/projections, не authoritative hidden state.
- Search routine агрегируется; ordinary month не показывает десятки вакансий.
- Referral/credential/salary/tenure не являются техническим evidence.
- Hiring outcomes deterministic для сохранённого MonthRun и не reroll после reload.
- Interview challenge использует shared Professional Challenge Engine.
- Employment routine автоматическая; нет daily task/hour clicking.
- Work outcome и character contribution разделены.
- Promotion не выдаёт grade.
- Layoff/company closure не уменьшают grade.
- Career transition имеет reason code и recovery path.
- Historical market facts имеют provenance; employers fictional.
- MVP Casual остаётся единственным обязательным профилем Phase 3.

## Compatibility и persistence

При реализации необходимо сохранять только фактически используемые поля:

- stable opportunity/process/offer/position IDs;
- selected Career Intent;
- generated visible/uncertain opportunity snapshot;
- committed hiring stages and decisions;
- deterministic RNG/Manifest references;
- active Employment Position;
- workplace trust/projection bands;
- career transition history;
- idempotency/dedup keys.

Active hiring и employment MonthRun должны resume без reroll и duplicate offer/salary/transition. Stable content IDs требуют migration/tombstone review.

## Проверка

Минимальные normative fixtures:

- first-job search with three differentiated opportunities;
- referral opens interview but does not guarantee offer;
- strong capability with weak visible signal;
- trainable technology gap;
- assisted interview result does not mint autonomy evidence;
- standard/conditional/alternate/rejection outcomes;
- offer salary-versus-mentorship trade-off;
- title/grade mismatch;
- workplace trust grows through reliable delivery/recovery;
- promotion delayed by missing position despite readiness;
- layoff preserves grade;
- performance dismissal recovery;
- break and re-entry;
- reload/resume/no-reroll/no-duplicate salary/offer/transition;
- long Russian text and keyboard-only UI.
