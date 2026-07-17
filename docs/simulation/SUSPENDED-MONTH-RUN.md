# Приостановленный MonthRun

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

## 1. Проблема

Blocking decision может остановить месяц. Committed save нельзя оставлять наполовину изменённым, а скрытый outcome не должен меняться после restart.

MVP risks:

- package outcome и professional result расходятся;
- duplicate resume создаёт второй result/release;
- hidden uncertainty reroll;
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

MVP project checkpoint:

- project/package IDs and revisions;
- package progress;
- deterministic hidden realization;
- uncertainty;
- pending project decision;
- provisional compact project outcome;
- provisional quality/debt/risk/release change;
- episode draft.

MVP professional checkpoint:

- stable episode ID/snapshot;
- provisional skill/technology delta;
- aggregated professional result ID/summary;
- progression trace hash.

No draft fields for unimplemented defect ledgers, incidents, teams, detailed claims or rollout policies.

## 4. Rules

- Draft never mutates committed save.
- One active run per save.
- Begin fixes base revision and fingerprints.
- Resume validates exact revisions, decision ID, compatibility and checksum.
- Duplicate request/answer does not reapply effects.
- IDs remain stable across reload.
- Provider outcome and progression use same rules/content context.
- Update/migration/content change is blocked or uses controlled migration.
- Safe close only after durable checkpoint.
- Abandon returns to committed state without draft effects.
- New Extended fields are not required when system is absent.

## 5. Checkpoint policy

Persist:

- before blocking event/project decision;
- after answer before later random/materialized phase;
- after hidden outcome realization when later suspend remains possible;
- before completed → committed.

Additional checkpoints are introduced with later systems, not predeclared as MVP requirements.

## 6. Deterministic IDs

```text
WorkPackageId = hash(saveId, projectId, originId, creationMonth, ordinal, rulesVersion)
ReleaseId = hash(saveId, projectId, releaseOrdinal, gameDate, rulesVersion)
ExperienceEpisodeId = hash(saveId, monthRunId, providerSourceId, outcomeOrdinal)
ProfessionalResultId = hash(saveId, monthRunId, episodeId, progressionRulesVersion)
```

Resume restores same IDs/results and consumes no new RNG for already materialized state.

## 7. Commit

One Rust/SQLite transaction:

1. validate base/run revisions/status;
2. validate final state/invariants/checksums;
3. write implemented normalized snapshot;
4. append compact release/important decision/history records;
5. append aggregated professional result/grade records when applicable;
6. write finance/life history;
7. increment save revision once;
8. write committed-run marker/trace;
9. clear draft;
10. commit.

Project outcome, episode and professional result cannot commit separately.

## 8. Recovery

Available:

- exact-compatible resume;
- supported draft migration;
- abandon and return to committed save;
- Safe Mode;
- read-only export;
- backup restore.

Forbidden:

- reroll hidden outcome;
- partial project commit;
- partial progression commit;
- silent rules/fingerprint substitution;
- requiring never-implemented Extended tables for recovery.

If provider checkpoint is intact but professional draft corrupt, professional result may be deterministically rebuilt with exact-compatible rules. If hidden provider realization cannot be verified, draft is abandoned/recovered, not rerolled.

## 9. MVP required tests

- close/restart at project/event decision;
- duplicate answer/resume;
- crash before/after hidden realization;
- crash after project outcome before episode/result;
- crash after episode/result before commit;
- crash after commit before cleanup;
- duplicate package/release/episode/result IDs;
- incompatible project/content/progression fingerprint;
- abandon without committed changes;
- exact professional rebuild from intact provider outcome;
- corrupted provider checkpoint recovery;
- read-only export.

Defect/incident/rollback tests are added with those systems.
