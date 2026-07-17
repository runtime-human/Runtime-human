# Симуляция месяца

Связанные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-007 — Determinism Manifest](../adr/ADR-007-determinism-manifest.md);
- [ADR-009 — Narrative Director](../adr/ADR-009-narrative-director.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Public contracts

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

Core pure. Application loads state/draft, validates revisions/compatibility/idempotency and persists through ports.

## State machine

```text
ready → running → suspended-for-decision → running → completed → committed
```

Explicit exceptional states:

```text
failed
incompatible-after-update
recovery-required
abandoned
```

## Deterministic context

MonthRunner inputs:

- committed base state;
- MonthPlan;
- GameDate/calendar;
- compiled immutable content registry;
- save/rules/content/mod/project/progression fingerprints;
- Determinism Manifest;
- root/fork RNG states;
- previous decision/input log;
- phase/checkpoint;
- provider checkpoints;
- project checkpoints;
- progression checkpoint.

No filesystem/SQLite/system clock/locale/process/UI reads.

## Versioned pipeline

1. Load committed save and active draft.
2. Validate revisions, schemas, fingerprints, manifest and idempotency.
3. Restore/create deterministic context and RNG forks.
4. Resolve month calendar days.
5. Apply scheduled world/era changes.
6. Calculate life capacity, health/fatigue and mandatory commitments.
7. Allocate integer work units across activities/commitments/projects.
8. Career/Company/Open Source/Education provide constraints, participants and signals.
9. Project Engine allocates received project work to active Work Packages.
10. Project Engine advances known work using project-specific capability/clarity/toolchain/coordination/continuity factors.
11. Project Engine reveals deterministic latent work/uncertainty and materializes package decision candidates.
12. Event Engine adds eligible events; Narrative Director selects blocking/display set.
13. Before blocking decision, persist immutable provider/project/progression checkpoint and return `suspended`.
14. Resume applies answer to the same package/event state and RNG state; no reroll.
15. Project Engine resolves package outcomes and updates scope/quality/debt/defects.
16. Evaluate release candidates, incidents, maintenance and immutable technical records.
17. Build participant contribution snapshots.
18. Experience Providers materialize stable `ExperienceEpisode`.
19. Professional Progression evaluates episodes:
    - mastery;
    - fluency/familiarity;
    - evidence candidates;
    - monthly practice;
    - explanations/trace.
20. Validate/materialize deterministic evidence IDs.
21. Product/Open Source/Company/Career consume typed project outcomes and apply their domain consequences.
22. Update finance/housing/world/relationships and other post-outcome systems.
23. Build readiness/project/report projections.
24. Validate cross-module invariants.
25. Build immutable final state, append-only deltas and canonical trace.
26. Application/Rust persistence performs one authoritative atomic commit.

Phase order is a versioned rules contract.

## Project checkpoint

Minimum:

- project/package revisions;
- scope/quality/debt/defect pre-state hashes;
- allocated participant work;
- package phase/progress;
- latent work realization/revealed amount;
- project RNG states;
- discovered uncertainty;
- pending project decision;
- provisional package outcome;
- release candidate/incident draft;
- contribution draft;
- episode draft;
- project trace hashes/fingerprints.

Exact hidden latent work cannot change after restart except supported migration.

## Professional checkpoint

Minimum:

- stable episode IDs;
- source/context snapshots or refs+hashes;
- draft skill/technology deltas;
- pending evidence IDs;
- anti-repeat state;
- monthly practice accumulators;
- readiness input hash;
- progression trace hash.

Draft episodes/evidence/releases are not committed history.

## Project RNG scopes

```text
project/{projectId}/package/{packageId}/latent-work
project/{projectId}/package/{packageId}/uncertainty
project/{projectId}/package/{packageId}/defect
project/{projectId}/release/{releaseId}/technical
project/{projectId}/incident/{incidentId}
```

Rules:

- package latent work is generated once;
- uncertainty/defect/release outcomes do not reroll on reload;
- UI forecast does not consume RNG;
- Progression does not reroll provider outcome;
- event/narrative scopes remain separate.

## Work allocation

Global allocation already includes life capacity/fatigue. Project Engine applies only project factors.

```text
effectiveWork = roundHalfEven(
  allocatedWork
  × capabilityFitBps
  × clarityBps
  × toolchainBps
  × coordinationBps
  × continuityBps
  / 10000^5
)
```

Debt drag consumes part of effective work before scope progress. Revealed latent work can increase known remaining work without reversing completed work.

## Project decision policy

Blocking when:

- material scope/quality/architecture/technology changes;
- debt/risk acceptance is significant;
- critical defect/incident response chosen;
- release/delay/cut/rollback selected;
- ownership/delegation commitment changes;
- provider cannot safely apply configured policy;
- ethics/security/relationship consequence is material.

Routine implementation/maintenance does not block.

## Project outcome → episode

Project Engine finalizes technical truth first:

- completion/partial/failure/recovery;
- quality/debt/defect deltas;
- release/incident state;
- player/team contribution.

Only then it builds `ExperienceEpisode`.

Progression cannot:

- change project quality/debt/defects;
- turn partial into delivery;
- attribute team outcome to player;
- generate evidence from revenue/popularity alone.

## Deterministic IDs

Examples:

```text
WorkPackageId = hash(saveId, projectId, originId, creationMonth, ordinal, rulesVersion)
ReleaseId = hash(saveId, projectId, releaseOrdinal, gameDate, rulesVersion)
IncidentId = hash(saveId, projectId, sourceDefectOrRisk, monthRunId, ordinal)
ExperienceEpisodeId = hash(saveId, monthRunId, providerSourceId, outcomeOrdinal)
EvidenceId = hash(saveId, monthRunId, episodeId, outcomeOrdinal, progressionRulesVersion)
```

## Checkpoint policy

Persist checkpoint:

- before every blocking decision;
- after accepted answer before next blocking phase;
- after latent work/defect/release random materialization if later phases can suspend;
- after provider outcomes before progression if needed;
- before completed → committed.

No need to persist every microstep if crash/replay tests prove recoverability.

## Atomic authoritative commit

One Rust/SQLite transaction writes:

- normalized project/professional/other snapshot deltas;
- resolved Work Package state;
- quality/debt/defect state;
- releases/incidents/major decisions;
- contribution summaries;
- episodes/evidence/practice/grade records;
- finance/history/ledger;
- save revision;
- committed MonthRun marker/trace;
- draft cleanup.

Project outcome and evidence cannot commit separately.

## Side effects

### Authoritative

- draft/checkpoint;
- normalized snapshot;
- append-only histories/ledger/evidence/releases/incidents;
- revision/committed marker.

### Non-authoritative

- UI read models;
- project forecast/dashboard;
- readiness/specialization;
- charts/search indexes;
- notifications/audio;
- redacted diagnostics.

Non-authoritative effects do not change next month outcome.

## Idempotency

- duplicate request does not rerun operation;
- duplicate decision does not consume RNG;
- duplicate committed run does not apply month twice;
- duplicate package outcome/release/incident/episode/evidence ID is rejected/idempotent;
- save revision increments once;
- crash after commit uses committed marker;
- active draft belongs to exact base revision/fingerprints.

## Cross-module invariants

- date/MonthIndex monotonic;
- authoritative arithmetic integer/in-range;
- terminal project/package does not progress;
- package belongs to project and refs valid/tombstoned;
- latent realization stable;
- partial is not full completion;
- release immutable and valid;
- critical release gate bypass requires explicit risk acceptance/policy;
- low confidence is not treated as low quality;
- defect rolls stable;
- Project Engine does not mutate professional state;
- Product/Company/OSS do not mutate Project technical truth directly;
- team outcome separated from character contribution;
- episode references committed/provisional provider outcome;
- assistance does not increase autonomy claim;
- transfer does not create production evidence;
- readiness/project projections built from same final state;
- final state contains no draft-only values.

## Errors

Before run:

- validation/revision conflict;
- unsupported schema/rules/manifest;
- content/mod/project/progression mismatch;
- malformed plan/answer;
- incompatible active package/draft.

During run:

- invariant violation;
- overflow;
- invalid package transition;
- missing scope/dependency/source;
- inconsistent latent work realization;
- duplicate release/episode/evidence;
- impossible release gate/outcome;
- corrupted checkpoint/trace.

Core error does not mutate committed save. Persistence failure keeps completed run recoverable.

## Trace

Each phase stores stable ID, input/output hashes, RNG scope and applied IDs.

Project trace includes:

- project/package IDs/revisions;
- allocation/effective work and integer modifiers;
- latent work revelation;
- decision/answer;
- quality/debt/defect deltas;
- release gate/outcome;
- contribution mapping;
- episode IDs;
- reason codes.

Production trace bounded; debug trace shares canonical hash.

## Performance targets

- normal month p95 ≤ 100 ms;
- heavy month p95 ≤ 500 ms;
- project processing scales with active packages, not full project history;
- routine resolved packages can compact;
- releases/incidents/significant debt remain append-only;
- read models use projections/indexes;
- mass simulation uses pure core without React/Tauri/SQLite per run;
- optimization cannot change deterministic result.
