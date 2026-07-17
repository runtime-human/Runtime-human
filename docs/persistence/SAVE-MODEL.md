# Модель сохранения

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Consistency boundary

`SaveGameState` — consistency boundary завершённого месяца. Domain tables normalized, but MonthRun changes them atomically.

The following always commit/rollback together:

- provider/project outcome;
- ProjectState/WorkPackage/quality/debt/defect delta;
- release/incident/contribution history;
- `ExperienceEpisode`;
- professional state/evidence/practice/grade delta;
- finance/other cross-system consequences.

## Authoritative structure

```text
current normalized snapshot
+ append-only histories / ledger / evidence / releases / incidents
+ persisted pending MonthRun draft
+ committed MonthRun markers/traces
+ rolling backups
+ rebuildable projections
```

Full event sourcing is not used.

## Save metadata

- save ID/display name;
- infrastructure created/updated timestamps;
- game date/MonthIndex;
- save schema version;
- project/work-package/release schema versions;
- professional/evidence/projection schema versions;
- rules version;
- content/mod/project/progression fingerprints;
- Determinism Manifest;
- committed revision/last run;
- health/recovery state;
- checksum/canonical envelope hash;
- backup metadata.

System timestamps do not affect game outcome.

## Normalized snapshot

Authoritative records:

- character/life state;
- professional state;
- people/relationships;
- employment/activities;
- projects;
- project goals/constraints/scope slices;
- project components;
- active/recent Work Packages;
- project quality dimensions;
- technical debt aggregate/significant records;
- latent defect aggregates/known defects;
- project maintenance/participant/ownership state;
- products/open-source extensions;
- company;
- inventory/equipment/housing;
- finance;
- world/city/timeline;
- narrative/arcs;
- achievements/lifecycle.

Normalized tables do not imply separate transactions.

## Project storage model

Logical tables/entities:

```text
projects
project_goals
project_constraints
project_scope_slices
project_requirements
project_components
work_packages
work_package_dependencies
work_package_participants
project_quality_dimensions
project_debt_aggregates
project_debt_records
project_latent_defect_aggregates
project_known_defects
project_maintenance_state
project_participant_plans
```

A physical implementation may use versioned payload columns for bounded profiles, but IDs/revisions/status and critical references remain queryable/validated.

## Append-only project history

- project lifecycle milestones;
- major scope/architecture/technology decisions;
- releases;
- incidents/rollbacks;
- significant contribution summaries;
- project repair/migration records.

`ReleaseRecord` immutable after commit.

Significant debt/defect records are managed state with append-only origin/resolution history; they are not silently deleted.

## Resolved package compaction

Routine resolved packages may compact after retention window while preserving:

- package semantic snapshot;
- final outcome;
- scope/quality/debt/defect deltas;
- contribution summary;
- release/episode/evidence refs;
- trace hash;
- rules/content fingerprints.

Never compact away:

- releases;
- incidents;
- significant debt/scope decisions;
- records referenced by evidence/history;
- active/recovery packages.

## Professional append-only history

- `ProfessionalEvidenceEvent`/claims;
- `MonthlyPracticeAggregate`;
- `ProfessionalGradeAward`;
- progression migration/repair history.

Evidence stores semantic source/context snapshots and survives missing content.

## Derived/rebuildable data

- demonstrated/current-market readiness;
- specialization/capability cards;
- evidence indexes;
- project dashboard/health;
- work forecast presentation;
- grouped debt/defect/risk summaries;
- portfolio comparison;
- release charts;
- monthly reports;
- search/thumbnail caches.

Derived data is not the sole MonthRun input and may be rebuilt.

## Pending MonthRun

Draft stores exact deterministic/compatibility context.

Project draft minimum:

- project/package revisions and pre-state hashes;
- allocation;
- package progress;
- latent work realization;
- project RNG states;
- uncertainty/pending decision;
- provisional outcome;
- quality/debt/defect provisional deltas;
- release/incident candidate;
- contribution/episode draft;
- project trace/fingerprint.

Professional draft minimum:

- episode refs/snapshots;
- professional delta;
- pending evidence IDs/claims;
- practice/anti-repeat state;
- progression trace/fingerprint.

Draft is not committed history. One active draft per save.

## Revision and idempotency

- save revision increments once per successful authoritative transaction;
- project/package each have domain revisions;
- draft has run revision;
- mutating commands include expected revisions/request ID;
- conflicts never overwrite silently;
- committed run ID prevents duplicate month;
- deterministic package/release/incident/episode/evidence IDs prevent duplicate records;
- crash after commit uses committed marker;
- projection cache update does not require save revision unless policy says so.

## Backups

Backup includes:

- project/professional snapshots;
- release/incident/evidence/history ledgers;
- schema/rules/content/fingerprint metadata;
- active draft when policy allows;
- projection caches optional/rebuildable.

Recommended slots:

- manual;
- current autosave;
- rolling previous revisions;
- pre-migration/pre-update;
- read-only import preview.

## Integrity on open

Check:

1. file/envelope/SQLite/pragmas;
2. save/project/professional/evidence schema versions;
3. foreign keys/stable refs;
4. rules/content/mod/project/progression compatibility;
5. Determinism Manifest;
6. active draft/committed marker consistency;
7. project/package state-machine validity;
8. latent work realization/checksum;
9. release immutability/reference validity;
10. debt/defect origin/resolution references;
11. duplicate package/release/incident/episode/evidence IDs;
12. evidence/grade history validity;
13. critical domain invariants;
14. recovery flags.

Forecast/project/readiness caches may be dropped/rebuilt if projection version mismatches.

## Rust write protocol

Only Rust persistence service performs authoritative write:

- DTO validation;
- expected revisions/idempotency;
- explicit SQLite transaction;
- checked integer conversion;
- snapshot/history/project/evidence consistency;
- unique IDs/constraints;
- release immutability;
- cache invalidation metadata;
- commit/rollback/error mapping.

Rust does not calculate project outcome, defect roll or evidence.

Renderer has no raw SQL execute capability.

## Compatibility

New version must not silently:

- continue incompatible active package/MonthRun;
- reroll latent work/defects/releases;
- change numeric scale/RNG/project phase order;
- rewrite release history;
- remove debt/defect/scope/evidence without migration/tombstone;
- merge/split packages in a way that duplicates outcome/evidence;
- recalculate awarded grade;
- convert revenue/stars into technical quality/evidence;
- discard missing mod semantic snapshots;
- rewrite append-only history without repair/migration record.

If writable migration is impossible: exact-compatible version, Safe Mode, read-only export or backup restore.
