# Приостановленный MonthRun

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

## 1. Проблема

Blocking decision может остановить месяц. Committed save нельзя оставлять наполовину изменённым, а materialized outcome не должен меняться после restart.

Risks:

- provider outcome и professional result расходятся;
- duplicate resume создаёт второй result/release/offer/transition;
- project uncertainty или career opportunity/interview/offer reroll;
- offer acceptance создаёт position без salary/schedule commitment;
- job end оставляет активную salary;
- draft требует поля несуществующих Extended systems.

## 2. State machine

```text
ready → running → suspended-for-decision → running → completed → committed
```

Exceptional:

```text
failed / incompatible-after-update / recovery-required / abandoned
```

## 3. Profile-aware draft

Draft stores only state required by implemented systems.

Common:

- run/save IDs and revisions;
- date/month;
- implemented schema/rules/content versions;
- fingerprints/Manifest;
- RNG states;
- MonthPlan;
- phase/step;
- pending decision;
- decision/input history;
- canonical payload/trace hashes.

Project/professional checkpoint:

- project/package IDs and revisions;
- package progress;
- deterministic hidden realization/uncertainty;
- pending project decision;
- provisional compact project/quality/debt/risk/release outcome;
- stable episode/result draft;
- provisional skill/technology delta;
- progression trace hash.

Career Slice checkpoint, only after Phase 3 implementation:

- career/search/process/offer/position IDs and revisions;
- selected Career Intent;
- surfaced opportunity snapshots;
- visible/uncertain condition snapshots;
- candidate-signal snapshot;
- active hiring stage/template/version;
- selected portfolio story/approach;
- shared Challenge/Learning request and outcome refs;
- deterministic interview/workplace complication;
- employer projection/reason codes;
- provisional hiring outcome/offer;
- workplace expectation/trust/transition proposal;
- career content/rules fingerprints and RNG states.

No draft fields for unimplemented defect ledgers, incidents, teams, detailed claims, Company, global labor market, detailed contracts or office politics.

## 4. Rules

- Draft never mutates committed save.
- One active run per save.
- Begin fixes base revision and fingerprints.
- Resume validates exact revisions, decision ID, compatibility and checksum.
- Duplicate request/answer does not reapply effects or consume new RNG.
- IDs remain stable across reload.
- Provider outcome and Progression use the same rules/content context.
- Opportunity, interview complication, employer decision, offer conditions and transition reason remain stable after materialization.
- Career cannot commit owner salary/capacity/project/professional effects separately.
- Update/migration/content change is blocked or uses controlled migration.
- Safe close only after durable checkpoint.
- Abandon returns to committed state without draft effects.
- New Extended fields are not required when system is absent.

## 5. Checkpoint policy

Persist:

- before any blocking event/project/learning/career decision;
- after answer before later random/materialized phase;
- after hidden outcome/opportunity/interview/offer materialization when later suspend remains possible;
- before completed → committed.

Additional checkpoints are introduced with later systems, not predeclared as earlier MVP requirements.

## 6. Deterministic IDs

```text
WorkPackageId = hash(saveId, projectId, originId, creationMonth, ordinal, rulesVersion)
ReleaseId = hash(saveId, projectId, releaseOrdinal, gameDate, rulesVersion)
ExperienceEpisodeId = hash(saveId, monthRunId, providerSourceId, outcomeOrdinal)
ProfessionalResultId = hash(saveId, monthRunId, episodeId, progressionRulesVersion)
CareerOpportunityId = hash(saveId, searchId, definitionId, generationMonth, ordinal, careerRulesVersion)
HiringProcessId = hash(saveId, opportunityId, processOrdinal, careerRulesVersion)
EmploymentOfferId = hash(saveId, processId, outcomeOrdinal, careerRulesVersion)
CareerTransitionId = hash(saveId, positionId, transitionOrdinal, gameDate, careerRulesVersion)
```

Resume restores the same IDs/results and consumes no new RNG for already materialized state.

## 7. Commit

One Rust/SQLite transaction:

1. validate base/run/entity revisions/status;
2. validate final state/invariants/checksums;
3. write only implemented normalized snapshots;
4. append compact release/important project/career history;
5. append eligible professional result/grade records;
6. write finance/life/relationship owner changes;
7. increment save revision once;
8. write committed-run marker/trace;
9. clear draft;
10. commit.

Project/Career provider outcome and professional result cannot commit separately when they belong to one decision.

Offer acceptance cannot commit `EmploymentPosition` without compensation and schedule/capacity owner commitments. Employment termination cannot leave active salary or mandatory work commitment.

## 8. Recovery

Available:

- exact-compatible resume;
- supported draft migration with golden fixture;
- abandon and return to committed save;
- Safe Mode;
- read-only export;
- backup restore.

Forbidden:

- reroll materialized project or career outcome;
- partial project/career/progression commit;
- silent rules/fingerprint substitution;
- recreating an expired/missing active opportunity from changed content;
- converting employer cancellation/layoff into candidate failure;
- requiring never-implemented Extended tables for recovery.

If provider checkpoint is intact but professional draft corrupt, professional result may be deterministically rebuilt with exact-compatible rules. If materialized provider/career snapshot cannot be verified, draft is abandoned/recovered, not rerolled.

## 9. Required tests

Base:

- close/restart at project/event/learning decision;
- duplicate answer/resume;
- crash before/after hidden realization;
- crash after provider outcome before episode/result;
- crash after episode/result before commit;
- crash after commit before cleanup;
- duplicate package/release/episode/result IDs;
- incompatible content/rules/progression fingerprint;
- abandon without committed changes;
- exact professional rebuild from intact provider outcome;
- corrupted provider checkpoint recovery;
- read-only export.

Career Slice adds:

- close/restart after opportunity surfacing;
- close/restart at interview/offer/workplace decision;
- unchanged opportunity/complication/employer decision/offer terms;
- duplicate opportunity/process/offer/transition rejection;
- offer acceptance atomic with compensation/schedule;
- employment end atomic with salary/commitment stop;
- missing active career content recovery;
- career fingerprint incompatibility;
- employer cancellation/layoff cause preservation.

Defect/incident/Company/global-market tests are added only with those systems.
