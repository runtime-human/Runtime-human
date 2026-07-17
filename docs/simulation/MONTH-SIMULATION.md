# Симуляция месяца

Связанные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-007 — Determinism Manifest](../adr/ADR-007-determinism-manifest.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

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

type MonthRunResult =
  | MonthRunSuspended
  | MonthRunCompleted
  | MonthRunFailed;
```

Core pure. Application validates state/draft/compatibility and persists through ports.

## 2. State machine

```text
ready → running → suspended-for-decision → running → completed → committed
```

Exceptional:

```text
failed / incompatible-after-update / recovery-required / abandoned
```

## 3. Profile-aware pipeline

MonthRunner processes only implemented systems and fields.

MVP Casual:

1. Load committed save and active draft.
2. Validate revisions, schemas, fingerprints, manifest and idempotency.
3. Restore/create deterministic context.
4. Resolve calendar/world changes.
5. Calculate life capacity and mandatory commitments.
6. Allocate integer work units across active activities.
7. Advance current project Work Package using compact factors.
8. Materialize deterministic uncertainty/hidden outcome.
9. Select eligible event/project decision.
10. Persist checkpoint and suspend when a blocking decision exists.
11. Resume with same state/RNG; no reroll.
12. Resolve compact project outcome and quality/debt/risk/release change.
13. Create one stable `ExperienceEpisode` where meaningful.
14. Apply mastery/fluency/familiarity and aggregated professional result.
15. Apply life/finance/relationship consequences.
16. Build short monthly report/read models.
17. Validate invariants.
18. Commit one atomic transaction.

Recommended/Extended phases are inserted only when their systems exist and require a rules/schema version change.

## 4. Deterministic context

Inputs:

- committed base state;
- MonthPlan;
- GameDate/calendar;
- compiled active content registry;
- implemented schema/rules/content fingerprints;
- Determinism Manifest;
- RNG states;
- previous decision/input log;
- phase/checkpoint.

No filesystem, SQLite, system clock, locale or UI reads.

## 5. MVP checkpoint

Stores only restart-critical state:

- save/run/project/package revisions;
- pre-state hashes;
- allocated work;
- package progress;
- deterministic hidden realization;
- uncertainty;
- pending decision and answer history;
- provisional compact project outcome;
- provisional quality/debt/risk/release change;
- episode/professional result draft;
- RNG states;
- trace/fingerprint.

No checkpoint fields for unimplemented debt ledgers, defect inventories, teams, incidents or detailed evidence claims.

## 6. MVP RNG scopes

```text
project/{projectId}/package/{packageId}/hidden-outcome
project/{projectId}/package/{packageId}/uncertainty
event/{eventId}
narrative/{monthIndex}
```

Additional defect/release/incident scopes are added with those systems.

Rules:

- hidden outcome generated once;
- already materialized result never rerolls;
- UI forecast consumes no RNG;
- Progression does not reroll provider outcome;
- event/narrative streams remain separate.

## 7. Work allocation

Life/health capacity applied once globally.

MVP project progress:

```text
effectiveWork = roundHalfEven(
  allocatedWork
  × capabilityFitBps
  × clarityBps
  × toolSupportBps
  × debtBps
  / 10000^4
)
```

- all values integer/fixed-point;
- debt reduces future effective progress;
- hidden work may reveal additional required work;
- full outcome requires state checks, not only a progress value;
- team coordination factors are added only with team gameplay.

## 8. Blocking policy

Ordinary month: 0–1 blocking decision.

Blocking only when:

- scope/quality/risk/release choice is meaningful;
- character must choose help versus independence;
- important commitment changes;
- life/professional crisis has no safe default;
- configured policy cannot resolve outcome.

Routine implementation, learning, maintenance and minor events do not block.

## 9. Project outcome → professional result

Project Engine first decides:

- completed/partial/failure/recovery;
- three quality bands;
- debt/risk/known issue;
- release/delay state;
- participation: independent/assisted/team/review.

Then it creates `ExperienceEpisode`.

Progression cannot:

- rewrite project result;
- turn partial into delivery;
- treat assisted as independent;
- derive mastery from popularity/revenue.

## 10. Deterministic IDs

MVP examples:

```text
WorkPackageId = hash(saveId, projectId, originId, creationMonth, ordinal, rulesVersion)
ReleaseId = hash(saveId, projectId, releaseOrdinal, gameDate, rulesVersion)
ExperienceEpisodeId = hash(saveId, monthRunId, providerSourceId, outcomeOrdinal)
ProfessionalResultId = hash(saveId, monthRunId, episodeId, progressionRulesVersion)
```

IDs restore identically after resume.

## 11. Checkpoint policy

Persist:

- before blocking decision;
- after accepted answer before later random/materialized phases;
- after hidden outcome materialization when later suspend is possible;
- before completed → committed.

No need to store every microstep if replay tests prove recovery.

## 12. Atomic commit

One Rust/SQLite transaction writes only implemented deltas:

- project/package state;
- compact quality/debt/risk/release state;
- episode and professional delta/result;
- life/finance/history changes;
- save revision;
- committed-run marker/trace;
- draft cleanup.

Project outcome and professional progression cannot commit separately.

## 13. Side effects

Authoritative:

- checkpoint;
- snapshot/history;
- revision/committed marker.

Rebuildable:

- casual project/professional cards;
- forecast/readiness status;
- monthly report;
- notifications/diagnostics.

Rebuildable output cannot change next MonthRun.

## 14. Idempotency

- duplicate request does not rerun operation;
- duplicate decision consumes no new RNG;
- duplicate committed run does not apply twice;
- duplicate package/release/episode/result ID rejected or returns prior result;
- save revision increments once;
- active draft belongs to exact base revision/fingerprint.

## 15. Cross-module invariants

- date monotonic;
- integer values in range;
- terminal package does not progress;
- hidden realization stable;
- partial is not full completion;
- release immutable;
- Project Engine does not mutate professional state;
- participation semantics preserved;
- final state contains no draft-only values;
- absent Extended fields are not required;
- report projections use same final state.

## 16. Errors

Before run:

- validation/revision conflict;
- unsupported implemented schema/rules/manifest;
- content fingerprint mismatch;
- malformed plan/answer;
- incompatible active draft.

During run:

- invariant violation;
- overflow;
- invalid package transition;
- inconsistent hidden realization;
- duplicate stable ID;
- corrupted checkpoint/trace.

Core error never mutates committed save.

## 17. Trace

MVP bounded trace:

- phase ID;
- input/output hashes;
- package ID/revision;
- allocation and compact modifiers;
- hidden realization ID;
- decision/answer;
- compact project outcome;
- episode/result IDs;
- reason codes.

Advanced trace details are added only with implemented systems.

## 18. Performance targets

- ordinary month p95 ≤ 100 ms on reference machine;
- heavy month p95 ≤ 500 ms;
- processing scales with active commitments/packages;
- no replay of full history;
- optimization cannot change deterministic result.

## 19. Casual-first verification

- same decision understood and restored after restart;
- ordinary month has bounded blocking choices;
- compact result explains causality;
- no duplicate/reroll;
- no need for unimplemented Extended phases;
- player wants to continue after first MonthRun.
