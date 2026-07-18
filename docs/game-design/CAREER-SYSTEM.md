# Карьерная система

Нормативные источники:

- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Career Engine](PROGRAMMER-CAREER-ENGINE.md);
- [Programmer Career UI](../ui/PROGRAMMER-CAREER-UI.md);
- [Programmer Career Balance](../simulation/PROGRAMMER-CAREER-BALANCE.md);
- [Programmer Career Content](../content/PROGRAMMER-CAREER-CONTENT.md);
- [Historical Labor Market Catalog](../content/HISTORICAL-LABOR-MARKET-CATALOG.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md).

Этот документ является обзором Career domain. Полный нормативный контракт находится в `PROGRAMMER-CAREER-ENGINE.md`.

## Цель

Career domain превращает профессиональную историю персонажа в доступные возможности, отбор, предложение, рабочий контекст, доход, ответственность и следующие переходы.

Карьера не выдаёт mastery или grade за стаж и не становится HR/company-management simulator.

```text
capability/evidence
→ visible signals
→ opportunity
→ hiring
→ offer
→ employment context
→ workplace outcomes/trust
→ transition
```

## Boundary

Career owns:

- opportunity/search/hiring/offer lifecycle;
- employer-visible candidate signals and role-fit projection;
- position/title/role expectation;
- employment contract references;
- workplace trust;
- promotion/lateral move/exit/firing/layoff/re-entry;
- career history;
- labor-market opportunity projection.

Career does not own:

- professional mastery/evidence/grade;
- Project technical scope/quality/debt/defects/releases;
- Learning outcome;
- technical challenge resolution;
- Company teams/payroll/budget/portfolio;
- NPC relationships;
- health/capacity;
- actual money ledger.

## Ключевое разделение

Нормативно различаются:

- Professional Grade;
- Grade Readiness;
- Market Competitiveness;
- Employer Role Fit;
- Employment Position/Title;
- Workplace Trust.

Поэтому допустимы:

- Middle capability в Junior position;
- inflated title без соответствующего grade;
- grade сохранён после перерыва при сниженной market readiness;
- новая ответственность без formal promotion;
- lateral specialization move.

Title, salary, tenure, fame и referral не являются technical evidence.

## Career Opportunity

Vacancy — один из источников opportunity наряду с:

- school/community channel;
- mentor/peer referral;
- project/open-source invitation;
- recruiter;
- client;
- internal transfer;
- former employer.

Opportunity содержит:

- employer archetype;
- role family/title/expected scope;
- hard access requirements;
- demonstrated capability expectations;
- familiarity expectations;
- visible market signals;
- trainable gaps/preferences;
- visible and uncertain conditions;
- selection plan;
- market context.

Source может открыть доступ или улучшить информацию, но не гарантирует offer.

## Search

Игрок выбирает устойчивый Career Intent:

- first entry;
- mentorship;
- specialization;
- income;
- stability;
- flexibility;
- portfolio;
- network;
- quiet search.

Routine browsing, obvious mismatches, scheduling и ordinary rejection агрегируются. Обычный search month показывает максимум 1–3 meaningful opportunities.

Player does not manually submit dozens of applications.

## Hiring

Meaningful stages:

- portfolio/project discussion;
- situational interview;
- bounded work sample;
- manager/team conversation;
- offer discussion.

Technical stages route through Professional Challenge Engine. Preparation/onboarding routes through Learning Engine.

Hiring outcome может быть:

- strong/standard/conditional offer;
- internship/trial;
- alternate role;
- continue after preparation;
- talent pool;
- rejection with/without feedback;
- candidate withdrawal;
- employer cancellation.

No fully random rejection. No syntax trivia, embedded coding IDE or LLM judge in baseline.

## Offer

Offer сравнивается по 4–6 relevant dimensions:

- income;
- stability;
- mentorship;
- task scope;
- technology relevance;
- workload;
- autonomy;
- growth;
- flexibility.

Часть условий может оставаться uncertain до interview/probation/first months. UI не показывает exact hidden probability или universal utility score.

## Work as persistent commitment

После employment работа автоматически:

- occupies capacity;
- creates compensation contract;
- supplies workplace Project/Challenge/Learning contexts;
- aggregates routine work;
- creates employer expectations and feedback;
- may create career transition.

Player does not press “work” each month and does not schedule daily tasks.

Ordinary work month normally has 0–1 blocking professional decision.

## Career → Project contract

Career provides:

```text
employment/project refs
role expectations
stakeholder/deadline constraints
quality/release expectations
autonomy/ownership expectation
available mentorship/review
organizational process/tooling signals
```

Project Engine returns:

```text
package/release outcome
forecast/deadline result
quality/debt/defect summary
character/team contribution
ownership/reliability summary
```

Career cannot mutate ProjectState.

## Workplace Trust

Trust is not a friendship/loyalty/global performance meter. It describes what current employer is ready to delegate.

Relevant dimensions:

- delivery confidence;
- autonomy confidence;
- quality confidence;
- collaboration confidence;
- growth trajectory;
- allowed scope.

Trust uses contribution, risk disclosure, assistance and recovery. Team success without character contribution does not create personal trust. One failure does not automatically destroy trust.

## Promotion

Promotion possibility uses:

```text
professional readiness
+ sustained workplace evidence
+ workplace trust
+ available position/scope
+ employer policy/sponsorship
+ company state
```

Possible results:

- scope expansion;
- salary adjustment;
- formal promotion;
- lateral transfer;
- specialization transition;
- promotion delay/denial;
- external growth path.

Promotion does not award Professional Grade. Grade does not force employer promotion.

## Employers and Company boundary

Career MVP uses fictional employer archetypes, not full companies:

- small product team;
- large stable organization;
- service/contract team.

Company Engine later owns teams, payroll, budgets, portfolio and restructuring. Career consumes typed signals and does not duplicate CompanyState.

## Job loss and recovery

Transition reason remains semantic:

- voluntary exit;
- contract end;
- layoff;
- closure/reorganization;
- role mismatch;
- performance dismissal;
- misconduct;
- health/life interruption;
- burnout.

Layoff/closure do not reduce grade. Performance dismissal may create employer signal damage but not erase mastery/history.

Recovery:

- alternative employer/role;
- portfolio/evidence;
- learning/reacquisition;
- referral/community;
- bounded/trial role;
- freelance/project route;
- market recovery.

## Labor market

MVP uses compact `LaborMarketProfile` by:

```text
era + region + industry + role family
```

It influences opportunity frequency/type, competition/selectivity, credential bias, portfolio openness, referral leverage, trainable-gap tolerance, compensation pressure, stability, remote reach and common selection patterns.

Historical claims require provenance. Employers remain fictional.

## MVP Casual Career Slice

- one labor-market profile;
- three employer archetypes;
- one role family;
- three opportunity templates;
- one Career Intent;
- maximum three surfaced opportunities;
- one portfolio discussion;
- one diagnose interview situation;
- four approaches;
- standard/conditional/alternate/rejection outcomes;
- two offer profiles;
- one employment position;
- one workplace challenge;
- simple trust bands;
- one promotion-delayed/scope-expanded preview;
- one rejection recovery;
- deterministic suspend/resume/no-reroll.

## Invariants

- Career does not mutate professional state directly.
- Career does not duplicate ProjectState or CompanyState.
- Grade/title/position/role fit/trust remain distinct.
- Employer sees signals, not hidden mastery points.
- Search routine aggregates.
- Referral/credential/tenure/salary are not technical evidence.
- Interview outcomes do not mint production evidence.
- Employment is automatic commitment.
- No single authoritative performance score.
- Promotion is organizational; grade is professional.
- Job loss does not erase mastery/grade/history.
- Path-blocking state has fallback/retry/alternative.
- Key opportunity/interview/offer outcomes do not reroll.

## Verification

Required fixtures:

- strong capability / weak signal;
- referral opens stage but does not guarantee offer;
- trainable technology gap;
- salary vs mentorship choice;
- conditional/alternate/rejection outcomes;
- title vs grade mismatch;
- trust grows from reliable delivery/recovery;
- promotion delayed by missing position;
- layoff preserves grade;
- performance dismissal recovery;
- break/re-entry;
- no reroll/duplicate salary/offer/transition;
- long Russian and accessibility states.
