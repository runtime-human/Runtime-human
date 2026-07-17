# Модель сохранения

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

## 1. Consistency boundary

`SaveGameState` — consistency boundary завершённого месяца.

Commit/rollback together:

- provider/project outcome;
- minimal project state delta;
- `ExperienceEpisode`;
- professional state/result delta;
- finance/life consequences;
- important append-only history.

## 2. Authoritative structure

```text
current normalized snapshot
+ bounded append-only histories
+ pending MonthRun draft
+ committed-run markers/traces
+ rolling backups
+ rebuildable projections
```

Full event sourcing is not used.

## 3. Profile-aware schema rule

Persistence stores only fields required by implemented gameplay profile.

- MVP Casual has minimal project/professional state.
- Recommended/Extended add tables/columns through migrations.
- Empty future ledgers are not created.
- Architecture seams are documented contracts, not preallocated schema.

## 4. Save metadata

- save ID/display name;
- game date/MonthIndex;
- save schema version;
- active project/professional schema versions;
- rules/content fingerprints;
- Determinism Manifest;
- committed revision/last run;
- recovery/backup metadata;
- canonical checksum.

Metadata does not list schema versions for unimplemented systems.

## 5. MVP normalized snapshot

Authoritative:

- character/life state;
- minimal professional state;
- people/relationships needed by current content;
- active commitments/activities;
- minimal projects and Work Packages;
- three project quality bands;
- debt/risk/known issue band;
- compact release state;
- inventory/equipment/housing;
- finance;
- world/city/timeline;
- narrative state;
- achievements/lifecycle.

Not required in MVP:

- project component/requirement tables;
- debt ledger;
- defect inventory;
- maintenance pressure;
- participant plans;
- detailed evidence claims/indexes;
- company/portfolio/team tables;
- incident/rollback history.

## 6. MVP logical project storage

```text
projects
work_packages
project_quality
project_releases
project_history
```

Possible minimal fields:

### `projects`

- ID;
- stage;
- goal snapshot;
- debt/risk bands;
- known issue snapshot;
- release state;
- revision.

### `work_packages`

- ID/project ID;
- objective snapshot;
- state/progress/challenge/uncertainty/forecast;
- pending decision;
- outcome;
- revision.

### `project_quality`

- functional;
- usability;
- maintainability;
- optional situational payload.

### `project_releases`

- immutable compact release record.

Physical implementation may use versioned payload columns where practical.

## 7. Recommended/Extended project migrations

Add only with feature:

- optional/deferred scope;
- significant debt records;
- known defects/incidents;
- team contribution;
- detailed release history;
- maintenance;
- components/requirements;
- portfolio.

Each migration documents current gameplay consumer and rollback/recovery.

## 8. Professional storage

MVP snapshot:

- two aptitude values;
- active skill mastery/fluency;
- active technology familiarity;
- professional focus;
- awarded grade list.

MVP append-only:

- aggregated meaningful professional result;
- routine monthly practice aggregate;
- awarded grade when applicable;
- migration/repair record.

Detailed claims, context diversity and evidence browser indexes are added later if used.

## 9. Append-only history

MVP preserves:

- important project milestones;
- compact release records;
- important scope/quality/debt choices;
- meaningful professional outcomes;
- grade awards;
- life milestones;
- migration/repair history.

Minor routine progress is aggregated and not stored as one record per day/action.

## 10. Derived/rebuildable

- readiness status/profile;
- specialization;
- capability cards;
- project card/forecast;
- grouped history;
- monthly reports;
- search/thumbnail caches.

Advanced dashboards/indexes are created only when feature exists.

## 11. Pending MonthRun draft

Draft stores exact state needed to resume without reroll.

MVP project draft:

- project/package revisions and pre-state hashes;
- allocated work;
- provisional package progress;
- deterministic hidden realization;
- uncertainty/pending decision;
- provisional compact project outcome;
- provisional quality/debt/risk/release change;
- project trace/fingerprint.

MVP professional draft:

- episode ID/snapshot;
- provisional mastery/fluency/familiarity delta;
- aggregated professional result ID;
- progression trace/fingerprint.

No draft fields for unimplemented ledgers.

## 12. Revision and idempotency

- save revision increments once per successful commit;
- project/package/draft use revisions;
- mutating commands carry request ID/expected revision;
- conflicts do not overwrite silently;
- committed run marker prevents duplicate month;
- deterministic project/episode/result/release IDs prevent duplicate records;
- crash after commit resolves through committed marker.

## 13. Backups

Backup includes implemented snapshots/histories, schema/rules/content metadata and active draft according to policy.

Rebuildable caches optional.

Recommended slots:

- current autosave;
- rolling previous revisions;
- manual;
- pre-migration/pre-update;
- read-only import preview.

## 14. Integrity on open

MVP checks:

1. file/envelope/SQLite/pragmas;
2. implemented schema versions;
3. stable references;
4. rules/content compatibility;
5. Determinism Manifest;
6. active draft/committed marker;
7. package state validity;
8. hidden realization checksum;
9. release immutability;
10. duplicate IDs;
11. professional/project cross-invariants;
12. recovery flags.

Do not fail open because absent Extended tables were never implemented.

## 15. Rust write protocol

Rust persistence service performs:

- DTO validation;
- revision/idempotency checks;
- explicit transaction;
- checked conversion;
- snapshot/history consistency;
- unique constraints;
- commit/rollback/error mapping.

Rust does not calculate project or progression outcome.

Renderer has no raw SQL execute capability.

## 16. Compatibility

New version must not silently:

- continue incompatible active draft/package;
- reroll hidden outcome;
- change numeric/RNG/phase rules;
- rewrite release/grade history;
- duplicate outcome during schema expansion;
- discard semantic snapshots;
- convert popularity/title into technical progression.

Adding Recommended/Extended fields requires migration only when the feature enters implementation.

If migration impossible: exact-compatible version, Safe Mode, read-only export or backup restore.

## 17. Invariants

- storage matches active profile;
- no speculative empty schemas;
- project/progression/life commit atomically;
- routine history bounded;
- meaningful history readable after content changes;
- projections rebuildable;
- hidden outcome restart-safe;
- Extended migration cost considered before feature approval.
