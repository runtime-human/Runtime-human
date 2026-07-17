# Граница persistence

Нормативные решения:

- [ADR-004 — Persistence Execution Boundary](../adr/ADR-004-persistence-execution-boundary.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

## 1. Решение

Authoritative writes, migrations, MonthRun checkpoints/commit, backup, restore, import/export and mod ingest execute in Rust services/repositories.

Renderer has no raw SQL execute.

```text
React UI
→ typed application facade
→ typed Tauri command
→ Rust persistence service
→ SQLite managed writer
```

## 2. Profile-aware persistence

Rust persists only fields belonging to the active implemented profile.

- MVP DTOs contain minimal project/professional state.
- Recommended/Extended DTOs are added with schema migration and feature.
- Rust does not require absent future tables/fields.
- Generic unvalidated future payload is not used to bypass typed contracts.

## 3. TypeScript responsibilities

- pure simulation;
- compact WorkPackage/project outcome;
- active quality/debt/risk/release transitions;
- `ExperienceEpisode` creation;
- professional progression/result;
- application orchestration;
- DTO schemas/ports/read models;
- validation before persistence command.

Extended calculations are added only with implemented systems.

## 4. Rust responsibilities

- database lifecycle/SQLite gate/pragmas;
- implemented schema migrations;
- transaction/revisions/idempotency;
- MonthRun draft/checkpoints/commit;
- minimal normalized snapshots;
- compact release/important history records;
- aggregated professional result/grade records;
- unique constraints;
- projection invalidation;
- serialization/checked integer conversion;
- backup/restore/import/export;
- Safe Mode/recovery/diagnostics.

Rust does not calculate gameplay outcomes.

## 5. MVP commit contract

MonthRun commit DTO includes:

- final implemented snapshot;
- project/package delta;
- compact quality/debt/risk/release delta;
- provider episode;
- professional state/result delta;
- finance/life history;
- committed-run marker/trace;
- projection invalidation metadata.

Rust validates:

- expected save/run/project/package revisions;
- unique run/package/release/episode/result IDs;
- valid package transition;
- hidden realization checksum;
- project outcome → episode → professional result relation;
- grade order/uniqueness when grade exists;
- checked integer ranges;
- no draft-only values;
- snapshot/history consistency.

Project and professional result cannot commit separately.

## 6. Draft persistence

MVP checkpoint stores:

- project/package revisions;
- progress/hidden realization/RNG state;
- uncertainty/pending decision;
- provisional compact outcome;
- compact quality/debt/risk/release change;
- episode/professional draft;
- hashes/fingerprints.

No fields for unimplemented incident/debt/defect/team/evidence-detail systems.

Rust preserves payload exactly and does not interpret formulas.

## 7. IPC

- versioned runtime-validated DTO;
- `bigint` as canonical decimal string;
- request/idempotency ID and expected revisions;
- explicit active schema/rules versions;
- payload limits;
- stable typed errors;
- no unnecessary paths/secrets;
- TS/Rust contract tests.

## 8. Capabilities

Production main window has no:

- SQL execute;
- shell proxy;
- arbitrary filesystem;
- updater/signing/release operations.

Read-only debug access exists only in a separate development capability.

## 9. Rust boundary limit

Rust does not:

- choose events/narrative;
- create/advance packages;
- materialize hidden project outcome;
- evaluate release choice;
- create episodes/professional result;
- calculate mastery/grade/readiness;
- interpret content.

It persists the validated canonical result.

## 10. Concurrency

- one managed writer;
- commit/migration/backup/restore/import mutually exclusive;
- reads avoid UI-blocking transactions;
- duplicate requests idempotent/conflict;
- projection rebuild bounded;
- unique constraints guard duplicate records.

## 11. MVP tests

- TS ↔ Rust DTO round trip;
- integer boundaries;
- permission/no SQL execute;
- interrupted checkpoint/write recovery;
- duplicate request/package/release/episode/result;
- hidden realization round trip;
- project + episode + professional result atomicity;
- compact release immutability;
- grade award persistence when applicable;
- projection invalidation/rebuild;
- backup/migration/restore;
- incompatible pending draft;
- absent Extended tables do not break open/recovery.

Extended tests are added with implemented systems.
