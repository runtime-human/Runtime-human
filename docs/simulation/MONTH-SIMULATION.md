# Симуляция месяца

Связанные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-007 — Determinism Manifest](../adr/ADR-007-determinism-manifest.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

## 1. Public contracts

```ts
type BeginMonthCommand = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  plan: MonthPlan;
}>;

type ResumeMonthCommand = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: MonthRunRevision;
  decisionId: DecisionId;
  answer: DecisionAnswer;
}>;

type MonthRunResult = MonthRunSuspended | MonthRunCompleted | MonthRunFailed;
```

Core pure. Application validates compatibility/revisions and persists through typed ports.

## 2. State machine

```text
ready → running → suspended-for-decision → running → completed → committed
```

Exceptional:

```text
failed / incompatible-after-update / recovery-required / abandoned
```

## 3. Profile-aware pipeline

MonthRunner processes only implemented systems.

### Phase 1/2 MVP Casual

1. Load committed save/draft.
2. Validate schema/rules/content/manifest/revisions/idempotency.
3. Restore/create deterministic context.
4. Resolve calendar/world.
5. Calculate life capacity and mandatory commitments.
6. Advance implemented Learning/Project/Event providers.
7. Materialize deterministic hidden outcomes.
8. Select at most one blocking decision.
9. Checkpoint and suspend.
10. Resume without reroll.
11. Resolve provider outcome.
12. Create eligible `ExperienceEpisode`.
13. Apply Progression interpretation.
14. Apply Life/Finance/Relationship consequences.
15. Build report, validate and atomically commit.

### Phase 3 Career Slice additions

Only after Career schema/content/rules exist:

1. Validate active CareerState/draft.
2. Project candidate-visible signals from immutable professional/history snapshots.
3. Advance employment routine and commitments.
4. Advance active search/hiring/offer.
5. Materialize stable opportunity/process/offer snapshots.
6. Submit shared Project/Learning/Challenge requests where required.
7. Compete for the same global 0–1 blocking-decision budget.
8. Checkpoint before opportunity/interview/offer/workplace choice.
9. Resume from identical snapshots/RNG.
10. Apply Career outcome, workplace trust and transition proposals.
11. Create Career `ExperienceEpisode` only for eligible real outcome.
12. Atomically commit all touched owner deltas.

No empty Career/Company passes before Phase 3.

## 4. Deterministic context

Inputs:

- committed state/draft;
- MonthPlan/GameDate;
- compiled active content;
- implemented schema/rules/content fingerprints;
- Determinism Manifest/RNG states;
- prior decision log;
- phase/checkpoint.

No filesystem, SQLite, system clock, locale or UI reads.

## 5. Checkpoint

Store only restart-critical state.

Project/professional:

- revisions/pre-state hashes;
- allocated work;
- hidden realization/uncertainty;
- pending decision/answers;
- provisional project/quality/debt/risk/release outcome;
- episode/progression draft;
- RNG/trace/fingerprint.

Career Slice:

- career/search/process/offer/position revisions;
- Career Intent;
- surfaced opportunity snapshots;
- visible/uncertain conditions;
- candidate signal snapshot;
- hiring stage/template/version;
- selected portfolio story/approach;
- shared provider request/outcome refs;
- deterministic interview/workplace complication;
- employer projection/reasons;
- provisional hiring outcome/offer;
- workplace trust/transition proposal;
- RNG/manifest/fingerprint.

No fields for unimplemented Company, detailed contracts or global labor-market populations.

## 6. RNG scopes

Examples:

```text
project/{projectId}/package/{packageId}/hidden-outcome
project/{projectId}/package/{packageId}/uncertainty
career/search/{searchId}/opportunities
career/process/{processId}/stage/{stageId}/complication
career/process/{processId}/employer-decision
career/offer/{offerId}/uncertainty
career/position/{positionId}/workplace-situation
event/{eventId}
narrative/{monthIndex}
```

Rules:

- materialize once;
- no reroll after reload;
- UI projection consumes no RNG;
- duplicate answer consumes no RNG;
- provider streams remain separated.

## 7. Work and capacity

Life/health capacity applies once globally. Employment is a mandatory commitment input; Career does not recalculate capacity or transfer money.

Project progress remains integer/fixed-point and owner-controlled. Team factors appear only with team gameplay.

## 8. Blocking policy

Ordinary month has 0–1 blocking decision globally.

Blocking only for meaningful:

- scope/quality/risk/release choice;
- help versus independence;
- career opportunity/interview/offer/workplace trade-off;
- major commitment change;
- life/professional crisis;
- unresolved policy conflict.

Routine implementation, learning, job search, applications, employment, salary, maintenance and minor events do not block.

## 9. Career provider contracts

### Search

```text
Career Intent
+ market/access/current-employment snapshots
+ Candidate Signal Profile
+ compiled definitions
+ deterministic context
→ opportunity snapshots + routine aggregate
```

### Hiring

```text
saved HiringProcess
+ candidate approach
+ shared Challenge/Learning outcome where requested
+ employer profile
→ stage/outcome/offer proposal + reasons
```

### Employment

```text
EmploymentPosition/context
+ Project contribution/outcome
+ assistance/disclosure/recovery facts
→ trust/feedback/transition proposal
```

Career cannot rewrite owner outcomes, mutate grade/mastery, pay salary, consume capacity or create Company truth.

## 10. Evidence rule

Project/Learning/Career provider first establishes real domain outcome. Progression interprets it.

Interview/work sample may create employer signal, feedback or Learning Opportunity, but does not automatically create production evidence.

Title, salary, tenure, referral and employer popularity do not create mastery/evidence.

## 11. Stable IDs

```text
WorkPackageId = hash(saveId, projectId, originId, creationMonth, ordinal, rulesVersion)
ExperienceEpisodeId = hash(saveId, monthRunId, providerSourceId, outcomeOrdinal)
CareerOpportunityId = hash(saveId, searchId, definitionId, generationMonth, ordinal, careerRulesVersion)
HiringProcessId = hash(saveId, opportunityId, processOrdinal, careerRulesVersion)
EmploymentOfferId = hash(saveId, processId, outcomeOrdinal, careerRulesVersion)
CareerTransitionId = hash(saveId, positionId, transitionOrdinal, gameDate, careerRulesVersion)
```

IDs restore identically after resume.

## 12. Checkpoint policy

Persist:

- before blocking decision;
- after accepted answer before later materialization;
- after hidden/opportunity/complication materialization when later suspend is possible;
- before completed → committed.

## 13. Atomic commit

One transaction writes only touched implemented deltas:

- project/package/release;
- career search/process/offer/position/trust/transition;
- episode/professional result;
- life/finance/history;
- save revision/committed marker;
- draft cleanup.

Offer acceptance cannot commit position without owner compensation/schedule commitments. Employment end cannot leave salary active. Provider and Progression changes from one decision cannot commit separately.

## 14. Derived output

Rebuildable:

- project/progression/career cards;
- forecast/readiness/role-fit/trust explanations;
- opportunity ranking/comparison;
- report/notifications/diagnostics.

Rebuildable output cannot change the next MonthRun.

## 15. Idempotency

- duplicate request/decision/run does not reapply;
- duplicate IDs return prior result or fail safely;
- opportunity/process/offer/transition/salary apply once;
- save revision increments once;
- active draft belongs to exact base revision/fingerprint.

## 16. Cross-module invariants

- date monotonic and integer values valid;
- hidden/materialized state stable;
- partial is not full completion;
- release immutable;
- provider does not mutate Progression;
- Career does not mutate Project/Company/Life/Economy owner state directly;
- employer projection uses candidate signals, not copied hidden mastery;
- Grade, title, position, role fit and trust remain distinct;
- promotion does not award grade;
- layoff/employer cancellation is not candidate capability failure;
- final state contains no draft-only values;
- absent Extended fields are not required.

## 17. Errors

Before run:

- revision/schema/rules/content/manifest mismatch;
- malformed plan/answer;
- incompatible draft;
- missing owner ref;
- expired/inconsistent offer/process.

During run:

- invariant/overflow;
- invalid project/career transition;
- inconsistent materialized snapshot;
- duplicate stable ID or salary/position transition;
- corrupted checkpoint/trace.

Core error never mutates committed state.

## 18. Performance and verification

Targets:

- ordinary month p95 ≤ 100 ms;
- heavy month p95 ≤ 500 ms;
- bounded active commitments/packages/processes;
- no full-history replay;
- no huge simulated applicant/employer population.

Verification:

- one understood restored decision;
- 0–1 blocking decision;
- 1–3 meaningful career opportunities;
- routine search/work aggregated;
- causal compact result;
- no reroll/duplicate;
- title/grade and candidate/employer causes understandable;
- rejection/layoff recovery;
- player wants to continue.
