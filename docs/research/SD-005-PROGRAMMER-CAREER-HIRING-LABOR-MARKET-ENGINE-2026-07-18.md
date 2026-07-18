# SD-005 — Programmer Career, Hiring & Labor Market Engine

- **Дата:** 2026-07-18
- **Статус:** normalized research; решения интегрированы через ADR-018
- **Scope:** opportunities, hiring, offers, employment context, workplace trust, promotion, job loss/re-entry and compact labor market
- **Implementation profile:** MVP Casual for future Phase 3 Career Slice

## Executive verdict

Runtime Human уже имеет владельцев технической правды: Learning, Professional Challenge, Project и Professional Progression. Career не должен пересчитывать их результаты.

Собственная формула SD-005:

```text
capability/evidence
→ market-visible signals
→ opportunities under incomplete information
→ selection
→ offer trade-off
→ employment context
→ workplace trust and transitions
```

> Карьера — это выбор среды, в которой подтверждённые способности превращаются в работу, доход, ответственность, новые доказательства и следующие возможности.

## 1. Проблема

Плоская модель сводит карьеру к vacancy, skill threshold, salary и автоматическому promotion по стажу. Слишком глубокая модель превращает игру в HR/office simulator с application spam, employee schedules и performance spreadsheets.

Обе крайности противоречат programmer-first и casual-first канону.

## 2. Метод исследования

Приоритет:

1. official assessment/career/statistical documentation;
2. primary company engineering frameworks;
3. official game pages;
4. secondary material only for failure modes.

Аналоги используются только как evidence отдельных patterns. Итоговая модель является собственной.

## 3. Primary evidence

### Structured interviews and work simulations

U.S. Office of Personnel Management описывает structured interview как последовательную оценку job-related competencies через вопросы о прошлом поведении и hypothetical work situations. OPM также разделяет situational judgment и work simulation.

Sources:

- `https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews`
- `https://www.opm.gov/agency-services/talent-management-services/assessment-and-evaluation/hiring-assessments/`

Применение:

- hiring stage должен быть связан с реальной ролью;
- bounded situation/work sample полезнее arbitrary trivia;
- разные типы assessment не сводятся к одному score.

Не переносится:

- полный стандартизированный HR process;
- exact psychometric scoring;
- правила одного региона как универсальный рынок.

### Engineering career frameworks

Dropbox Engineering Career Framework разделяет scope, collaborative reach и impact. Он прямо не является promotion checklist; promotion principles опираются на sustained demonstrated next-level results. Framework также поддерживает несколько engineering disciplines и отдельные IC/management paths.

Sources:

- `https://dropbox.github.io/dbx-career-framework/`
- `https://dropbox.github.io/dbx-career-framework/promotion_principles.html`
- `https://dropbox.github.io/dbx-career-framework/promotion_guidelines.html`

Применение:

- Grade отделён от title;
- promotion требует sustained evidence и доступного organizational scope;
- tenure не является proof;
- senior path не обязан вести в management.

Не переносится:

- company-specific levels, terminology и timing как universal balance.

### Labor-market segmentation

U.S. Bureau of Labor Statistics отдельно описывает software developers, QA/testers и отрасли с различающимися duties, conditions and projections.

Source:

- `https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm`

Применение:

- нет одного global programmer-demand score;
- market profile сегментируется по role family, industry, era and region.

Не переносится:

- modern U.S. salary/projection в fictional city и ранние эпохи.

### AI-assisted hiring transition

GitLab в 2026 году документировал proposed working group по redesign technical hiring around engineering judgment, intent, codebase navigation, iteration and validation in an AI-assisted environment.

Source:

- `https://handbook.gitlab.com/handbook/company/working-groups/ai-native-hiring/`

Применение:

- поздние era assessments могут различать delegation, understanding and verification;
- mechanical issue spotting/syntax trivia не обязаны оставаться центральными.

Ограничение:

- это proposed company initiative, не доказанный global market transition.

## 4. Аналоги

### BitLife

Полезно: быстрый жизненный темп, routine abstraction, карьерный выбор как часть жизни.

Не брать: работа как title/salary shell, generic work button и слабая profession-specific causality.

### Software Inc.

Полезно: специализации, разные work contexts, training/delegation.

Не брать: office construction, employee needs, payroll and schedule micromanagement.

### Game Dev Tycoon

Полезно: era progression, reflection after outcomes, capabilities unlock harder work.

Не брать: hidden optimal combinations, company growth as the only career, commercial score as professional truth.

### Football Manager

Полезно: recruitment focus, contextual role fit, incomplete information, reports and multi-dimensional offers.

Не брать: huge databases, scouting agents, detailed contract clauses and constant entity comparison.

## 5. Canonical model

```text
Professional Truth
→ Candidate Signal Profile
→ Labor Market + Opportunity Sources
→ 1–3 Meaningful Opportunities
→ Career Intent / Candidate Approach
→ Hiring Process
→ Offer / Alternate / Explained Non-offer
→ Employment Context
→ shared Project + Challenge + Learning providers
→ Workplace Trust / Career Transition
```

Unique properties:

- employer не видит exact hidden capability;
- signal visibility и capability различаются;
- opportunities частично uncertain;
- search routine aggregates;
- hiring reuses technical situations;
- offer является professional/life trade-off;
- employment создаёт contexts, а не work progress bar;
- trust определяет entrusted scope;
- promotion и Professional Grade разделены;
- market/company failure не переписывает capability.

## 6. Разделение понятий

| Concept | Meaning | Owner |
|---|---|---|
| Professional Grade | устойчиво подтверждённый уровень | Progression |
| Grade Readiness | недостающее evidence | Progression |
| Market Competitiveness | сила профиля в сегменте | Career derived |
| Employer Role Fit | employer-specific projection | Career derived |
| Position/Title | organizational label and scope | Career/Company |
| Workplace Trust | что текущий employer готов поручить | Career |

Это центральная anti-corruption boundary SD-005.

## 7. Opportunity and requirements

Vacancy является только одним источником. Возможности также приходят через education/community, referral, project/open-source, recruiter, client, internal transfer и former employer.

Requirements разделены:

- hard access;
- demonstrated capability;
- familiarity;
- market signal;
- trainable gap;
- preference.

Credential или technology keyword не становятся эквивалентом professional competence.

## 8. Search and hiring

`CareerIntent` заменяет application spam:

- first entry;
- mentorship;
- specialization;
- income;
- stability;
- flexibility;
- portfolio;
- network;
- quiet search.

Routine browsing/filtering/rejection агрегируется.

Meaningful hiring stages:

- portfolio discussion;
- situational interview;
- bounded work sample;
- manager/team conversation;
- offer discussion.

Technical stage delegates to Professional Challenge Engine.

Candidate approaches:

- show relevant project;
- explain gap honestly;
- prepare technology;
- emphasize learning trajectory;
- accept bounded work sample;
- clarify role;
- propose alternate scope;
- withdraw.

No approach is globally optimal.

## 9. Outcomes and offers

Outcomes:

- strong/standard/conditional offer;
- trial/internship;
- alternate role;
- continue after preparation;
- talent pool;
- rejection with/without feedback;
- candidate withdrawal;
- employer cancellation.

Reason codes separate candidate gap, signal gap, context mismatch, competition and employer cause.

Offer dimensions:

- income;
- stability;
- mentorship;
- task scope;
- technology relevance;
- workload;
- autonomy;
- growth;
- flexibility.

## 10. Employment and trust

Employment automatically consumes capacity, creates compensation contract and supplies shared Project/Challenge/Learning contexts. Routine work aggregates.

No single performance score. Employer tracks bounded projections:

- delivery;
- autonomy;
- quality;
- collaboration;
- growth trajectory;
- role fit.

Workplace Trust expresses allowed scope.

## 11. Promotion and recovery

Promotion possibility:

```text
professional readiness
+ sustained workplace evidence
+ trust
+ available scope/position
+ employer policy/sponsorship
+ company state
```

Possible results include scope expansion, salary adjustment, formal promotion, lateral move, delayed promotion or external growth path.

Layoff/closure do not reduce grade. Performance dismissal can damage market signal but does not erase mastery/history. Break reduces fluency/familiarity/visibility, not awarded grade.

## 12. Historical model

`LaborMarketProfile` uses:

```text
era + region + industry + role family
```

It projects demand, competition, selectivity, credential bias, portfolio openness, referral leverage, trainable-gap tolerance, compensation pressure, stability, remote reach and selection patterns.

Historical facts and uncertainty live in a separate catalog.

## 13. First Career Slice

Starting state:

- one completed personal project;
- one independent and one assisted episode;
- beginner technology familiarity;
- no commercial history.

Opportunities:

1. small product team — lower income, strong mentorship, broad scope, medium stability;
2. large automation department — medium income, formal mentorship, narrow scope, high stability;
3. continue portfolio — no income, high autonomy, delayed entry.

Hiring situation asks the character to explain a real debugging story or resolve a bounded diagnose situation.

Outcomes include internship/trainee, bounded junior-assistant, alternate role and rejection with concrete next step.

First work month includes one meaningful challenge, one trust explanation and one next-scope preview.

## 14. Failure gates

Design is rejected when:

- salary always wins;
- referral guarantees hire;
- credential replaces evidence;
- one project guarantees Junior;
- application spam is optimal;
- interview retries farm evidence;
- rejection lowers grade;
- job hopping or staying always dominates;
- title becomes grade;
- market creates permanent soft lock;
- employers differ only by salary;
- work becomes monthly performance clicking.

## 15. Deferred

- full Company simulation;
- management career;
- global remote market;
- visas/relocation;
- detailed compensation/contracts;
- office politics;
- multiple jobs;
- recruiting others;
- executive/founder endgame;
- LLM interview judge;
- embedded coding IDE.

## 16. Normative integration

SD-005 produced:

- ADR-018;
- `PROGRAMMER-CAREER-ENGINE.md`;
- `PROGRAMMER-CAREER-UI.md`;
- `PROGRAMMER-CAREER-BALANCE.md`;
- `PROGRAMMER-CAREER-CONTENT.md`;
- `HISTORICAL-LABOR-MARKET-CATALOG.md`;
- implementation plan.

## Final verdict

Runtime Human should not ask only:

> Какую вакансию с максимальной зарплатой выбрать?

It should ask:

> Какой профессиональный контекст мне доступен, что он проверяет, что я смогу доказать, чему научиться и какой ценой для жизни и будущей карьеры?
