---
title: "PROGRAMMER-CAREER-IMPLEMENTATION-PLAN"
type: plan
status: draft
canon: true
updated: 2026-07-18
---

# Programmer Career Engine — Implementation Plan

Нормативные источники:

- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Career Engine](../game-design/PROGRAMMER-CAREER-ENGINE.md);
- [Programmer Career UI](../ui/PROGRAMMER-CAREER-UI.md);
- [Programmer Career Balance](../simulation/PROGRAMMER-CAREER-BALANCE.md);
- [Programmer Career Content](../content/PROGRAMMER-CAREER-CONTENT.md);
- [Historical Labor Market Catalog](../content/HISTORICAL-LABOR-MARKET-CATALOG.md).

## Цель

Реализовать первый карьерный slice после успешного First Playable Year, не расширяя scope до Company/HR simulation.

Active profile:

```text
MVP Casual
```

## 1. Preconditions

Начало реализации блокируется, пока не выполнены Phase 1/2 gates:

- first-month and first-year loop playable;
- Learning/Challenge/Project/Progression contracts implemented;
- MonthRun suspend/resume/idempotency works;
- player understands guided vs independent result;
- one professional capability/evidence path reaches Intern readiness;
- normal UI remains sufficient;
- real save/fixture migration baseline exists.

## 2. Career Slice scope

Реализовать только:

- one era/region/industry `LaborMarketProfile`;
- three fictional employer archetypes;
- one entry programmer role family;
- three opportunity templates;
- three opportunity sources;
- one Career Intent decision;
- one search campaign;
- max three surfaced opportunities;
- one portfolio story projection;
- one portfolio discussion;
- one `diagnose` interview challenge;
- four candidate approaches;
- standard/conditional/alternate/rejection fixtures;
- two offer profiles;
- one accepted employment position;
- one workplace challenge;
- simple workplace trust bands;
- one scope-expanded/promotion-delayed outcome;
- one rejection recovery;
- deterministic reload/resume/no-duplicate.

Do not implement:

- full CompanyState;
- employee/team/payroll simulation;
- management career;
- global/remote market;
- detailed negotiation/contracts;
- office politics;
- multiple jobs;
- recruiting others;
- complete historical corpus.

## 3. Package boundary

Expected packages/modules after scaffold:

```text
packages/game-schema/src/career/
packages/game-core/src/career/
packages/game-content/src/career/
packages/game-application/src/career/
packages/game-ui/src/career/
packages/game-ui-fixtures/src/career/
```

Actual repository structure may differ after scaffold; use existing package conventions and do not create parallel architecture.

## 4. Public contracts

### IDs

Add branded IDs only when used:

- `CareerOpportunityId`;
- `CareerOpportunityDefinitionId`;
- `CareerSearchCampaignId`;
- `HiringProcessId`;
- `HiringStageId`;
- `EmploymentOfferId`;
- `EmploymentPositionId`;
- `EmployerArchetypeId`;
- `LaborMarketProfileId`.

### Enums/unions

- `CareerIntentKind`;
- `CareerOpportunitySource`;
- `CareerRequirementKind`;
- `HiringStageKind`;
- `HiringOutcomeKind`;
- `CareerTransitionKind`;
- bounded casual bands already present or minimally added.

### State

Add minimal schema:

- `CareerState`;
- `CareerSearchCampaign`;
- `HiringProcess`;
- `EmploymentOffer`;
- `EmploymentPosition`;
- `WorkplaceTrustState`;
- `CareerHistoryEntry`.

Do not pre-add Recommended/Extended fields.

## 5. Content definitions

Implement compile/validation for:

- `EmployerArchetypeDefinition`;
- `CareerRoleProfileDefinition`;
- `CareerOpportunityDefinition`;
- `HiringProcessTemplateDefinition`;
- `HiringStageTemplateDefinition`;
- `OfferProfileDefinition`;
- `EmploymentContextProfileDefinition`;
- `LaborMarketProfile`.

Validation gates:

- stable unique IDs;
- all refs resolved;
- historical source refs present;
- 1–2 meaningful hiring stages;
- 2–4 approaches;
- visible trade-off for every approach;
- opportunity has fallback/retry when path-critical;
- offer differs by non-salary dimension;
- technical stage references shared challenge definition;
- no executable formulas/scripts.

## 6. Core resolvers

Implement small direct typed resolvers, not generic DSL.

### `projectCandidateSignals`

Input:

- professional snapshot;
- eligible portfolio stories;
- credentials/recommendations/public history.

Output:

- immutable `CandidateSignalProfile`;
- reason trace.

### `generateCareerOpportunities`

Input:

- market profile;
- employer/opportunity definitions;
- access/life/current employment snapshots;
- candidate signals;
- Career Intent;
- Determinism Manifest.

Output:

- stable surfaced opportunity snapshots;
- aggregate routine search summary;
- reason trace.

### `advanceHiringProcess`

Input:

- saved process/stage;
- selected candidate approach;
- shared Challenge/Learning outcome where requested;
- candidate signals;
- employer profile;
- deterministic context.

Output:

- stage delta;
- employer projection update;
- hiring outcome/offer proposal;
- reason codes;
- no professional mutation.

### `acceptEmploymentOffer`

Creates:

- Employment Position proposal;
- compensation/schedule/life commitments;
- career history entry;
- initial workplace trust state.

Owners apply their own deltas atomically.

### `applyWorkplaceOutcome`

Input:

- contribution/outcome summaries;
- expectation snapshot;
- disclosure/assistance/recovery facts.

Output:

- relevant trust dimension proposals;
- organizational feedback;
- optional transition candidate.

### `resolveCareerTransition`

Supports only Career Slice outcomes:

- scope expanded;
- promotion delayed;
- voluntary exit;
- layoff/re-entry fixture support.

## 7. Shared-engine integration

### Progression

Career reads grade/readiness/capability/evidence summaries and portfolio stories. It never mutates them.

### Professional Challenge

Interview and workplace technical situations use existing `TechnicalSituation → Approach → Outcome` contract.

### Learning

Preparation/onboarding/recovery use `LearningOpportunity`. Hiring feedback may propose learning; it does not award learning directly.

### Project

Employment creates typed `ProjectWorkRequest`. Project returns contribution/outcome summaries.

### Economy/Life

Offer acceptance proposes compensation and schedule/capacity commitments. Actual ledger/capacity owners apply them.

## 8. MonthRun integration

### Search month

Persist before blocking decision:

- Career Intent;
- surfaced opportunities;
- visible/uncertain snapshots;
- candidate signal snapshot;
- generation fingerprint;
- decision IDs;
- manifest refs.

### Hiring month

Persist:

- stage/template version;
- selected portfolio story;
- situation/approaches/complication;
- candidate decision;
- shared challenge outcome;
- employer projection/reasons;
- offer/non-offer proposal.

### Employment month

Persist:

- routine work aggregate;
- workplace situation;
- expectation snapshot;
- owner outcomes;
- trust/transition proposal.

### Atomic commit

Where applicable commit together:

- Career delta;
- Project/Challenge/Learning results;
- Progression episode/evaluation;
- Economy/Life commitments;
- report/history;
- dedup keys.

## 9. Persistence and migration

Schema version includes only Career Slice fields.

Required tests:

- empty CareerState default;
- save/load active search;
- save/load active hiring stage;
- save/load offer expiry;
- save/load employment position;
- stable content snapshot/tombstone;
- migration from pre-career save;
- duplicate decision/commit rejection;
- no duplicate salary/offer/transition;
- suspended MonthRun resume.

## 10. UI implementation

Routes/components:

- Career overview;
- Career Intent selector;
- Opportunity cards;
- Opportunity comparison;
- Hiring stage using shared situation cards;
- Hiring result;
- Offer screen;
- Employment overview;
- Workplace feedback;
- Career transition/recovery.

Normal mode is complete. Details only adds explanations/history. Advanced is diagnostic.

## 11. First Career Slice content

### Starting character fixture

- one personal project;
- one independent diagnose outcome;
- one assisted learning outcome;
- beginner familiarity;
- Intern-ready or near-ready profile;
- no commercial position history.

### Opportunities

1. `small-product-team.entry-trainee`;
2. `large-automation.entry-assistant`;
3. `portfolio.continue-before-entry`.

### Hiring stage

Use one real portfolio story plus one shared `diagnose` situation.

Approaches:

- reproduce/clarify first;
- propose fast fix;
- explain gap and learning plan;
- request bounded help/alternative scope.

### Outcomes

- standard trainee offer;
- conditional internship;
- alternate narrower role;
- rejection with portfolio next step;
- employer cancellation fixture.

### Work month

- routine aggregate;
- one small existing-system problem;
- one quality/deadline or help/autonomy trade-off;
- one trust explanation;
- one next-scope preview.

## 12. Storybook fixtures

Implement every required story from `PROGRAMMER-CAREER-UI.md`, prioritizing:

- first search;
- three opportunities;
- salary/mentorship comparison;
- portfolio discussion;
- interview situation;
- four outcomes;
- active employment;
- mixed trust feedback;
- promotion delayed;
- layoff/re-entry;
- long RU/accessibility;
- suspended/reloaded unchanged state.

## 13. Automated tests

### Unit

- candidate signal projection;
- requirement classification;
- opportunity filtering/surfacing;
- intent influence without hard guarantee;
- role-fit reasons;
- hiring outcomes;
- offer comparison read model;
- trust dimension updates;
- title/grade separation;
- transition reason semantics.

### Property/fixture

- deterministic same input/result;
- no hidden opportunity/interview reroll;
- no duplicate offer/salary/transition;
- referral never guarantees offer across fixtures;
- credential does not mint autonomy;
- no-offer does not lower grade;
- layoff preserves grade;
- team outcome without contribution does not raise trust.

### UI

- keyboard navigation;
- screen-reader labels;
- long RU wrapping;
- 1–3 opportunity budget;
- 2–4 approach budget;
- no exact probability/score;
- Normal sufficient.

## 14. Balance/playtest

Use `PROGRAMMER-CAREER-BALANCE.md` gates.

Block Recommended expansion until players can:

- explain opportunity trade-off;
- distinguish title and grade;
- distinguish candidate gap and employer cancellation;
- choose in 10–20 seconds;
- recover from no-offer;
- understand workplace trust;
- continue after first offer/work month.

## 15. Implementation sequence

1. schemas/IDs/unions;
2. content definitions and validators;
3. candidate signal projection;
4. opportunity generation/search aggregate;
5. hiring process state/resolver;
6. shared Challenge integration;
7. outcome/offer resolver;
8. offer acceptance and owner proposals;
9. employment context/work routine;
10. workplace trust;
11. MonthRun/persistence/migration;
12. read models/UI;
13. Storybook fixtures;
14. unit/property/E2E tests;
15. balance simulation and human playtest.

## 16. Completion gate

Career Slice is complete only when:

- branch contains code/docs/content/tests together;
- active profile remains MVP Casual;
- no Company/HR scope leaked in;
- all owner boundaries compile and test;
- suspended search/hiring/work decision resumes identically;
- no duplicate offer/salary/transition;
- title/grade separation is visible;
- rejection and layoff have recovery;
- first job creates meaningful programmer gameplay;
- playtest exit criteria pass.

## 17. Deferred backlog

After successful Career Slice:

- multiple role families;
- salary negotiation;
- internal transfer;
- referrals/network depth;
- freelance/client route;
- regional market shocks;
- specialization transitions;
- IC/management fork;
- richer Company integration.
