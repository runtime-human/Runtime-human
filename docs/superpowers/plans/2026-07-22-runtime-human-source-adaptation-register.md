---
title: "Runtime Human source adaptation register"
type: plan
status: active
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-22
---

# Runtime Human source adaptation register

## 1. Purpose

This document records the external engineering and research sources used to improve Runtime Human, the mechanism taken from each source, the project-specific adaptation, and the executable evidence required before the adaptation is considered complete.

Licensing does not restrict technical research or comparison in this register. It still affects how code enters the repository: implementation is written specifically for Runtime Human, while third-party source code is copied only when its license and attribution requirements are deliberately accepted.

Source priority:

1. official specifications and primary library documentation;
2. source code of mature production applications;
3. peer-reviewed papers and official game/modding documentation;
4. smaller reference implementations;
5. tutorials only as a compatibility check, never as an architectural authority.

A source is not adopted as a package merely because its design is useful. Runtime Human keeps the smallest mechanism that proves a current requirement.

---

# 2. Persistence and crash safety — PR #18

## 2.1. SQLite official documentation

Primary references:

- WAL: <https://sqlite.org/wal.html>
- transactions and `BEGIN IMMEDIATE`: <https://sqlite.org/lang_transaction.html>
- synchronous durability: <https://sqlite.org/pragma.html#pragma_synchronous>
- Online Backup API: <https://sqlite.org/backup.html>
- atomic commit: <https://sqlite.org/atomiccommit.html>
- testing: <https://sqlite.org/testing.html>

Mechanisms adopted:

- one authoritative SQLite database;
- WAL for stable concurrent read behavior and future read-only projections;
- `synchronous=FULL` for acknowledged durable boundaries;
- `BEGIN IMMEDIATE` for early writer reservation;
- foreign-key enforcement;
- Online Backup API instead of copying the primary file;
- process-exit/reopen testing around transaction boundaries.

Runtime Human adaptation:

- no wall-clock values in authoritative rows;
- one monotonic operation sequence owned by the database;
- three independent checkpoint integrity values:
  - serialized checkpoint payload SHA-256;
  - internal MonthRun checkpoint fingerprint;
  - journal entry hash;
- final save commit, MonthRun transition, result, journal entry and request receipt in one transaction;
- backup publication as `.partial -> verified read-only reopen -> atomic rename -> durable receipt`;
- corrupted application payloads enter read-only recovery mode rather than being rewritten.

Evidence:

- pragma read-back;
- file-backed reopen tests;
- stale revision/hash CAS tests;
- SQL-trigger rollback after save CAS;
- child-process exit after commit before acknowledgement;
- backup verification and receipt replay;
- unclean-start save/checkpoint/journal/receipt scan.

## 2.2. `rusqlite 0.40.1`

Primary references:

- <https://docs.rs/rusqlite/0.40.1/rusqlite/>
- <https://docs.rs/rusqlite/0.40.1/rusqlite/backup/>
- <https://docs.rs/crate/rusqlite/0.40.1/features>

Selected features:

```toml
rusqlite = {
  version = "=0.40.1",
  default-features = false,
  features = ["backup", "bundled", "cache", "fallible_uint", "limits"]
}
```

Why:

- `bundled` fixes the SQLite engine used on Windows;
- `backup` exposes the Online Backup API;
- `cache` supports explicit prepared-statement reuse;
- `limits` allows a defensive resource boundary;
- `fallible_uint` prevents silent integer-domain assumptions;
- disabling defaults excludes the default native-irrelevant WASM FFI path.

Rejected alternatives for PR #18:

- SQLx: async pool and compile-time query infrastructure exceed the one-writer workload;
- `tokio-rusqlite`: generic closure execution is less restrictive than a closed command enum;
- `r2d2_sqlite`/`deadpool-sqlite`: a pool does not improve serialized authoritative writes;
- Diesel/SeaORM/SeaQuery: critical CAS SQL must remain directly reviewable;
- `serde_rusqlite`: authoritative row nullability and conversions remain explicit.

## 2.3. `rusqlite_migration 2.6.0`

Primary reference:

- <https://docs.rs/rusqlite_migration/2.6.0/rusqlite_migration/>

Mechanisms adopted:

- ordered embedded migrations;
- atomic `to_latest` application;
- `pending_migrations` for upgrade planning;
- `PRAGMA user_version` ownership;
- foreign-key verification hooks.

Runtime Human extension:

- deterministic migration manifest SHA-256 over number, stable name and exact SQL bytes;
- mismatch at the current version is `MigrationHistoryMismatch`, not an automatic rewrite;
- newer schema opens read-only;
- non-empty pre-versioned databases require recovery classification;
- verified backup is required before a future destructive migration.

Remaining implementation gate:

- add migration v2 fixture before the first real upgrade and prove backup-before-migrate/reopen. Migration v1 on a new database does not need a pre-migration backup.

## 2.4. Tauri 2 lifecycle

Primary references:

- <https://v2.tauri.app/develop/state-management/>
- <https://v2.tauri.app/develop/calling-rust/>
- <https://docs.rs/tauri/latest/tauri/async_runtime/fn.spawn_blocking.html>

Mechanisms adopted:

- persistence created during `setup`;
- handle stored through managed state;
- one `generate_handler!` command surface;
- async IPC methods delegate blocking worker communication through `spawn_blocking`;
- application-owned data and backup directories;
- shutdown requested on application exit.

Rejected:

- arbitrary SQL command;
- renderer-provided database or backup path;
- frontend-owned transaction handles;
- multiple unmanaged global connections.

## 2.5. GitButler

Repository:

- <https://github.com/gitbutlerapp/gitbutler>

Useful patterns:

- dedicated database handle;
- explicit writable and existing-file read-only open paths;
- immediate transactions;
- migration lifecycle separated from application repositories.

Runtime Human changes:

- `synchronous=NORMAL` becomes `FULL` for authoritative MonthRun acknowledgement;
- no generic table/ORM layer;
- no cache database;
- no unconditional truncate checkpoint;
- connection ownership moved behind a bounded worker instead of broad handle access.

## 2.6. Yaak

Repository:

- <https://github.com/mountain-loop/yaak>

Useful pattern:

- operation code receives an existing transaction context, so a multi-repository mutation cannot accidentally open another connection.

Runtime Human changes:

- no `r2d2` pool;
- no SeaQuery/generic upsert framework;
- transaction ownership remains in explicit create/begin/store/commit operations;
- repositories remain small SQL/mapping functions.

## 2.7. Tauri SQL plugin

Repository:

- <https://github.com/tauri-apps/tauri-plugin-sql>

Useful patterns:

- managed-state lifecycle;
- migration during setup;
- explicit resource cleanup.

Rejected public API:

- frontend `execute` and `select` would permit bypassing checkpoint hashing, receipts and CAS.

Runtime Human command surface remains domain-specific:

```text
persistence_create_save_v1
persistence_load_save_v1
persistence_begin_month_run_v1
persistence_load_month_run_v1
persistence_load_active_month_run_v1
persistence_store_month_run_boundary_v1
persistence_commit_month_run_v1
persistence_create_backup_v1
persistence_get_recovery_status_v1
```

## 2.8. Silvermine Tauri SQLite plugin

Repository:

- <https://github.com/silvermine/tauri-plugin-sqlite>

Useful patterns:

- exclusive writer;
- validated application paths;
- bounded resources;
- explicit cleanup;
- transaction timeout and rollback discipline.

Runtime Human changes:

- one connection until measured read contention exists;
- no frontend SQL builder;
- no attached databases;
- no observer/subscription layer;
- backup and recovery remain authoritative service operations.

## 2.9. SQLite/Turso crash-testing methodology

References:

- SQLite test documentation;
- SQLite `walcrash` methodology;
- <https://github.com/tursodatabase/turso> as a fault-injection architecture reference.

Adopted methodology:

- file-backed database, never only `:memory:`;
- deterministic injected SQL failure after an earlier mutation inside the transaction;
- process exit that bypasses Rust drops;
- reopen and compare against a model invariant;
- repeat the same request ID after acknowledgement loss.

Not adopted:

- another SQLite-compatible engine;
- distributed replication;
- broad storage-engine fuzz infrastructure inside the game repository.

---

# 3. Deterministic content compiler — PR #20

## 3.1. JSON Schema 2020-12

Primary reference:

- <https://json-schema.org/draft/2020-12>

Adopt:

- closed schemas;
- stable schema IDs;
- bounded strings/arrays/numbers;
- discriminated unions for content proposals and effects;
- schema version as part of content fingerprint.

Do not use schema validation as the only compiler stage. Add:

- reference validation;
- chronology validation;
- reachability validation;
- deterministic ordering;
- provenance registry;
- semantic constraints;
- duplicate/anti-repeat checks.

## 3.2. Ajv standalone validation

References:

- <https://ajv.js.org/json-schema.html>
- <https://ajv.js.org/standalone.html>

Adopt:

- Ajv only in build/tooling;
- standalone generated validators where runtime validation is required;
- no Ajv initialization in the initial renderer bundle;
- deterministic regeneration check in CI.

## 3.3. `jsonc-parser`

Repository:

- <https://github.com/microsoft/node-jsonc-parser>

Adopt:

- JSONC only as authoring syntax;
- source locations for compiler diagnostics;
- comments/trailing commas removed at compile time;
- no JSONC parser in authoritative runtime.

## 3.4. Vite lazy chunks

Reference:

- <https://vite.dev/guide/features.html#glob-import>

Adopt:

- era/domain chunks loaded through lazy `import.meta.glob` output;
- current month receives only relevant compiled registries;
- deterministic registry order is produced before bundling;
- chunk boundaries never affect candidate order or RNG use.

Acceptance gates:

- same source tree produces byte-identical registries;
- invalid reference/chronology/reachability fails compilation;
- initial bundle excludes later-era catalogs;
- no executable content script enters the runtime.

---

# 4. Determinism hardening — PR #21

Existing project decisions remain authoritative:

- keep `Xoshiro256StarStar` and full serialized state;
- keep SplitMix64 initialization;
- keep scoped RNG forks;
- keep safe-integer canonical JSON;
- keep SHA-256 fingerprints.

Reference mechanisms:

- `pure-rand` for unbiased integer selection;
- `@noble/hashes` for audited cross-platform SHA-256;
- official Xoshiro test vectors and independent Rust parity implementation.

Add:

- Node/WebView/Rust golden vectors;
- RNG call-count traces at MonthRun boundaries;
- lint/boundary rule forbidding `Math.random()` in authoritative packages;
- deterministic candidate ordering before any random choice;
- separate scopes for content, outcome, narrative and NPC decisions.

Do not replace the existing generator with PCG or an LLM-driven selector. A replacement would invalidate saves without improving the product requirement.

---

# 5. NPC and social simulation — PR #22–#25

## 5.1. Neighborly

Repository/documentation:

- <https://github.com/ShiJbey/neighborly>
- <https://neighborly.readthedocs.io/>

Useful mechanisms:

- characters, organizations and occupations as stable entities;
- directed relationships;
- traits/statuses;
- significant life events;
- recorded event history as narrative material;
- social rules rather than one global friendship score.

Runtime Human reduction:

- no town-wide ECS simulation;
- no daily simulation of every person;
- three fidelity tiers: active, background, archived;
- only player-relevant events activate detailed state;
- bounded person state and memory;
- monthly/event-driven updates.

## 5.2. Comme il Faut / Prom Week

Primary concept:

- social facts;
- directed social networks;
- traits/statuses;
- reusable social actions with preconditions, influence rules and effects;
- social history as context.

Runtime Human adaptation:

```text
from-person -> to-person
warmth
personal trust
professional trust
respect
conflict
obligation
familiarity
```

Rules propose typed effects. They never mutate unrelated domains directly.

## 5.3. Wildermyth events and hooks

Official reference:

- <https://wildermyth.com/wiki/Event>

Useful mechanisms:

- participant targeting by personality, hook and relationship;
- relationship-focused opportunity events;
- strong event recency suppression;
- permanent consequences from selected story events.

Runtime Human adaptation:

- 2–4 explicit narrative hooks per active NPC;
- eligibility and score modifiers, not opaque personality vectors;
- participant recency and same-NPC streak penalties;
- unresolved-hook continuation bonus;
- stable event ID tie-break before scoped RNG.

## 5.4. Storylets

Reference:

- <https://emshort.blog/2019/12/03/storylets-play-together/>

Adopt the minimal model:

```text
storylet
+ prerequisites
+ participant roles
+ scoring modifiers
+ choices
+ typed effect proposals
+ memory outputs
+ cooldown / anti-repeat key
```

Storylets do not execute arbitrary code and do not own domain state.

## 5.5. Generative Agents

Primary paper:

- <https://doi.org/10.1145/3586183.3606763>

Useful mechanisms:

- observation memory;
- relevance/salience/recency retrieval;
- compaction into higher-level summaries;
- planning informed by recalled experience.

Runtime Human deterministic adaptation:

- typed memory facts instead of natural-language logs;
- integer retrieval score;
- bounded per-person ledger;
- deterministic summary rules;
- explicit beliefs with confidence and source memories;
- no embeddings, vector database or runtime LLM.

The paper demonstrates that memory, reflection and planning each matter for believability. Runtime Human keeps these roles but replaces nondeterministic LLM inference with typed rules and fixed-point scoring.

---

# 6. Execution mapping

| PR | Main adaptation | Required evidence |
|---|---|---|
| #18 | SQLite/rusqlite/Tauri single-writer durable store | full Windows gate, rollback, process-exit replay, backup/recovery |
| #19 | persisted MonthRun orchestration | restart at ready/suspended/completed, duplicate IPC replay |
| #20 | compiled content pipeline | deterministic build, invalid-content fixtures, lazy era chunk |
| #21 | cross-runtime determinism | Node/WebView/Rust vectors and call-count traces |
| #22 | people and directed relationships | asymmetric relationship transitions and bounded snapshots |
| #23 | typed memory and beliefs | retrieval/compaction golden tests and memory bounds |
| #24 | utility social actions | deterministic scoring trace and stable tie-breaking |
| #25 | storylets and Narrative Director | eligibility, cooldown, anti-repeat and participant-recency simulation |
| #26 | January 1990 content | provenance, historical validation and programmer-first playthrough |
| #27 | balance simulation | seeded multi-run distributions and anti-soft-lock checks |
| #28 | first playable vertical slice | desktop restart playthrough, recovery UX and performance budget |

---

# 7. Version and source refresh policy

Before starting each PR:

1. verify exact package versions and MSRV/Node requirements;
2. read release notes since the previous locked version;
3. inspect security advisories and abandoned status;
4. compare the current repository source with the mechanism recorded here;
5. update this register only when the architectural conclusion changes;
6. pin production dependencies exactly until a deliberate upgrade PR;
7. avoid adding a dependency when the required mechanism is smaller than the integration surface.

A version bump cannot silently change:

- SQLite engine version;
- canonical serialization;
- RNG algorithm/state format;
- migration bytes;
- persistence command schema;
- compiled content ordering;
- NPC scoring order.

Such changes require explicit compatibility analysis, fixtures and migration strategy.

# 8. Global rejection list

Do not introduce without a new measured requirement and ADR:

- arbitrary renderer SQL;
- multiple authoritative writers;
- generic workflow engine;
- full event sourcing;
- ORM/query builder around critical CAS;
- cloud/libSQL replication;
- SQLCipher;
- runtime content scripts;
- runtime Ajv/JSONC parsing;
- city-wide NPC ECS;
- per-day simulation of inactive NPCs;
- vector memory;
- runtime LLM dialogue or decision authority;
- nondeterministic system time/randomness in authoritative state.
