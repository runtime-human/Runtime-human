# Граница persistence

Нормативные решения:

- [ADR-004 — Persistence Execution Boundary](../adr/ADR-004-persistence-execution-boundary.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Решение

Authoritative writes, migrations, MonthRun checkpoints/commit, project/professional history, backup, restore, import/export and mod ingest execute in Rust services/repositories.

Renderer has no raw SQL execute.

```text
React UI
→ typed application facade
→ typed Tauri command
→ Rust persistence service/repository
→ SQLite managed writer
```

## TypeScript responsibilities

- pure simulation;
- WorkPackage/project outcome calculation;
- quality/debt/defect/release state transitions;
- contribution and `ExperienceEpisode` creation;
- progression/evidence calculation;
- application contracts/orchestration;
- DTO schemas/ports/read models;
- validating core result before persistence command.

## Rust responsibilities

- database lifecycle/SQLite 3.51.3+ gate/pragmas;
- schema migrations;
- transactions/optimistic revisions/idempotency;
- MonthRun draft/checkpoints/commit;
- normalized project/professional snapshot;
- releases/incidents/scope decisions/contributions;
- evidence/practice/grade records;
- unique record constraints;
- projection cache invalidation/versioning;
- serialization/checked integer conversion;
- backup/restore/import/export;
- mod quarantine;
- Safe Mode/recovery/diagnostics.

Rust does not calculate project outcome, latent work, defects, releases, mastery, evidence or grade.

## Authoritative commit contract

MonthRun commit DTO includes:

- final normalized snapshot;
- ProjectState/WorkPackage/quality/debt/defect deltas;
- release/incident/major decision records;
- participant contribution summaries;
- provider outcomes/episodes;
- professional state/evidence/practice/grade deltas;
- finance/other histories/ledger;
- committed run marker/trace;
- projection invalidation metadata.

Rust validates:

- expected save/run/project/package revisions;
- unique run/package/release/incident/episode/evidence IDs;
- project/package lifecycle and references;
- release immutability/reference snapshots;
- latent realization/checksum consistency in draft;
- project outcome → episode → evidence relation;
- contribution refs;
- grade order/uniqueness;
- checked integer ranges;
- no draft-only state in committed snapshot;
- snapshot/history consistency.

Project outcome, release, episode and evidence cannot commit in separate transactions.

## Draft/checkpoint persistence

Project checkpoint stores:

- project/package revisions;
- progress/latent work/RNG states;
- uncertainty/pending decision;
- provisional quality/debt/defect/release/incident outcome;
- contribution/episode draft;
- hashes/fingerprints.

Professional checkpoint stores episode assessment and evidence draft.

Rust preserves payload exactly; it does not interpret gameplay formulas.

## IPC

- versioned runtime-validated DTO;
- `bigint` as canonical decimal string;
- request/idempotency ID and expected revisions;
- explicit project/professional schema/rules versions;
- payload limits;
- no unnecessary raw paths/secrets;
- stable typed errors;
- TS/Rust tests for optional/null/enum/union semantics.

## Capabilities

Production main window has no:

- `sql:allow-execute`;
- shell proxy;
- arbitrary filesystem;
- updater/signing/release operations.

Read-only SQL debug only in separate development capability.

## Rust boundary limit

Rust does not:

- choose events/narrative;
- create or advance Work Packages;
- reveal latent work/roll defects;
- evaluate release gates;
- create episodes/evidence claims;
- calculate mastery/grade/readiness;
- interpret content definitions.

It persists validated canonical result according to transaction/compatibility policy.

## Concurrency

- one managed writer;
- commit/migration/backup/restore/import mutually exclusive;
- reads avoid UI-blocking transactions;
- duplicate requests idempotent/conflict;
- projection rebuild bounded;
- unique constraints guard duplicate records.

## Tests

- TS ↔ Rust DTO round trips;
- project/professional integer boundaries;
- permissions/no SQL execute;
- interrupted checkpoint/write recovery;
- duplicate request/package/release/incident/episode/evidence;
- latent work/RNG payload round trip;
- project outcome + episode + evidence atomicity;
- release immutability;
- grade award persistence;
- projection invalidation/rebuild;
- backup/migration/restore;
- incompatible pending project/progression draft.
