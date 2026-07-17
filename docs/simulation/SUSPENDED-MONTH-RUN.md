# Приостановленный MonthRun

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Проблема

Blocking event/project decision может остановить месяц. Committed save нельзя оставлять наполовину изменённым.

Дополнительные atomicity risks:

- latent work/defect/release outcome не должен reroll после restart;
- package outcome, ProjectState delta и `ExperienceEpisode` не могут разойтись;
- professional delta/evidence должен commit только вместе с provider outcome;
- duplicate resume не создаёт второй release/incident/episode/evidence.

## State machine

```text
ready
→ running
→ suspended-for-decision
→ running
→ completed
→ committed
```

Exceptional:

```text
failed
incompatible-after-update
recovery-required
abandoned
```

## Draft model

`pending_month_runs` logically stores:

- run/save IDs and revisions;
- month/date;
- save/rules/content/mod/project/progression schema versions;
- fingerprints/Determinism Manifest;
- RNG algorithm and scoped states;
- MonthPlan;
- phase/step;
- intermediate immutable state;
- provider checkpoints;
- project checkpoints;
- stable package/release/incident/episode candidates;
- progression draft deltas/evidence/practice;
- anti-repeat/dedup state;
- pending decision;
- decision/input history;
- phase/project/progression trace hashes;
- infrastructure timestamps;
- canonical payload hash.

Physical schema may store versioned blobs, but logical information must remain recoverable.

## Project checkpoint

Minimum:

- project/package IDs and revisions;
- scope/quality/debt/defect pre-state hashes;
- allocated participant work;
- package lifecycle/progress;
- latent work realization and revealed amount;
- project RNG states;
- discovered uncertainty;
- pending project decision;
- provisional package outcome;
- release candidate/incident draft;
- contribution draft;
- episode draft;
- project fingerprints/trace hashes.

Exact latent work realization and completed rolls are immutable inside run.

## Progression checkpoint

Minimum:

- stable episodes/source snapshots;
- professional phase/step;
- draft skill/technology deltas;
- pending evidence IDs/claims;
- practice accumulators;
- anti-repeat state;
- readiness input hash;
- progression trace hash.

Draft project/progression records are not committed history.

## Rules

- Draft does not modify committed save.
- One active run per save.
- Begin fixes base revision and exact fingerprints.
- Resume validates run/base revisions, decision ID, project/progression compatibility and checksums.
- Duplicate request/decision does not reapply project/progression effects.
- Package/release/incident/episode/evidence IDs remain stable across reloads.
- Provider outcome and progression assessment use the same rules/content context.
- App update/migration/restore/content change is blocked or requires controlled draft migration.
- Safe close only after durable checkpoint.
- Abandon returns to committed save without applying project/professional drafts.
- Active draft never silently continues with new project/progression rules.

## Checkpoint policy

Persist:

- before blocking project/event decision;
- after answer before next blocking/random phase;
- after latent work/defect/release random materialization;
- after provider outcome before progression if needed;
- after progression assessment before commit;
- on explicit safe suspension;
- before completed → committed.

Every microstep need not be stored if crash/replay tests prove recovery.

## Deterministic IDs

```text
WorkPackageId = hash(saveId, projectId, originId, creationMonth, ordinal, rulesVersion)
ReleaseId = hash(saveId, projectId, releaseOrdinal, gameDate, rulesVersion)
IncidentId = hash(saveId, projectId, riskOrDefectSource, monthRunId, ordinal)
ExperienceEpisodeId = hash(saveId, monthRunId, providerSourceId, outcomeOrdinal)
EvidenceId = hash(saveId, monthRunId, episodeId, outcomeOrdinal, progressionRulesVersion)
```

Resume restores the same IDs/results and does not consume new RNG for already materialized outcomes.

## Commit

One Rust/SQLite transaction:

1. validate base/run revisions and status;
2. validate final state/invariants/checksums;
3. write normalized snapshot including ProjectState/professional state;
4. append releases/incidents/major scope decisions/contribution summaries;
5. append finance/history ledger;
6. append evidence/practice/grade records;
7. mark rebuildable projections stale/update cache metadata;
8. increment save revision once;
9. write committed run marker/trace;
10. safely clear active draft;
11. commit.

Project outcome, release, episode and evidence cannot commit separately.

Crash after commit before cleanup is guarded by committed run and deterministic record IDs.

## Recovery

Available:

- exact-compatible resume;
- controlled supported draft migration;
- abandon draft and return to committed save;
- Safe Mode;
- read-only diagnostic/export;
- backup restore.

Forbidden:

- reroll latent work/defects/releases;
- partial project commit without progression;
- partial progression commit without provider truth;
- silent fingerprint/rules substitution.

If project checkpoint is intact but progression checkpoint corrupt, progression may be deterministically rebuilt only with exact compatible versions. If project random realization/checkpoint is corrupt and cannot be verified, draft must be abandoned/recovered, not rerolled.

## Required tests

- close/restart on scope/quality/release/incident decision;
- duplicate answer/resume;
- crash before/after latent work revelation;
- crash after defect/release roll;
- crash after project outcome before episode;
- crash after episode/evidence before commit;
- crash after commit before cleanup;
- duplicate package/release/incident/episode/evidence IDs;
- incompatible project/content/progression fingerprint;
- changed manifest/RNG rules;
- abandon without ProjectState/professional changes;
- exact progression rebuild from intact provider outcome;
- corrupt project checkpoint recovery;
- read-only export.
