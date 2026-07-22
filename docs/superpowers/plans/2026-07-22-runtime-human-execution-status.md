---
title: "Runtime Human execution status and next gates"
type: plan
status: active
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-22
---

# Runtime Human execution status and next gates

This document is the current execution ledger for:

- `2026-07-21-month-run-sqlite-durable-store.md`;
- `2026-07-22-runtime-human-integrated-roadmap.md`;
- `2026-07-22-runtime-human-source-adaptation-register.md`.

When an older plan describes a task as remaining but this ledger marks it implemented, this ledger reflects the current repository state. Design invariants in the older plans remain authoritative unless explicitly changed here.

---

# 1. PR #18 — SQLite Durable MonthRun Store

## 1.1. Implemented production path

### Contracts and trust boundary

- [x] versioned TypeScript persistence commands;
- [x] exact-field runtime command parsers;
- [x] exact-field runtime response parsers;
- [x] canonical UTF-8 payload envelope and SHA-256;
- [x] independent internal MonthRun checkpoint fingerprint recomputation;
- [x] separate serialized payload SHA and internal checkpoint hash in CAS;
- [x] pure-core-produced committed checkpoint in the final commit command;
- [x] stable public persistence error codes;
- [x] redacted public errors without SQL, paths or payload contents;
- [x] cross-language persistence fixture.

### SQLite foundation

- [x] direct `rusqlite 0.40.1`;
- [x] bundled SQLite;
- [x] disabled default WASM FFI feature path;
- [x] backup/cache/fallible integer/limit features;
- [x] `rusqlite_migration 2.6.0`;
- [x] schema v1 in one atomic migration;
- [x] application-owned migration manifest fingerprint;
- [x] STRICT tables;
- [x] partial unique one-active-run index;
- [x] writable open/create path;
- [x] existing-file read-only path;
- [x] newer-schema read-only fallback;
- [x] WAL read-back;
- [x] `synchronous=FULL` read-back;
- [x] foreign-key and busy-timeout read-back;
- [x] defensive SQLite configuration;
- [x] disabled attached databases;
- [x] bounded SQLite value, SQL and variable limits.

### Worker and Tauri lifecycle

- [x] one connection owned by one named worker thread;
- [x] bounded command queue with capacity 64;
- [x] typed closed command enum;
- [x] overload and disconnected-worker errors;
- [x] cloneable handle for `spawn_blocking`;
- [x] shutdown request rejects new commands;
- [x] owning worker closes the connection;
- [x] join handle retained until shutdown completes;
- [x] Tauri `setup` path resolution;
- [x] managed persistence state;
- [x] one typed command registration surface;
- [x] async Tauri commands through `spawn_blocking`;
- [x] controlled exit shutdown;
- [x] no renderer-provided SQL or paths.

### Authoritative operations

- [x] create/load save;
- [x] begin/load/load-active MonthRun;
- [x] one active MonthRun per save;
- [x] durable checkpoint boundary CAS;
- [x] revision + serialized payload SHA + internal checkpoint hash comparison;
- [x] durable request receipt replay;
- [x] request-ID payload conflict detection;
- [x] hash-linked durable-boundary journal;
- [x] atomic completed-to-committed save update;
- [x] save/run/result/journal/receipt in one immediate transaction;
- [x] monotonic operation sequence instead of authoritative wall time;
- [x] committed run retained as history rather than moved/deleted.

### Backup

- [x] `persistence_create_backup_v1`;
- [x] application-owned backup directory;
- [x] renderer supplies request ID and save ID only;
- [x] SQLite Online Backup API;
- [x] bounded page batches;
- [x] `.partial` staging;
- [x] read-only reopen verification;
- [x] migration manifest, quick check and foreign-key verification through database open;
- [x] requested save and active-run presence inspection;
- [x] same-directory atomic rename;
- [x] redacted backup metadata without a path;
- [x] durable backup receipt;
- [x] duplicate receipt verifies the file;
- [x] crash after rename/before receipt recovers metadata from the verified snapshot;
- [x] same request ID/different payload conflict across both receipts and files.

### Recovery

- [x] clean-shutdown marker;
- [x] unclean-start application scan;
- [x] all save payload hashes and JSON;
- [x] save schema fingerprint shape;
- [x] active checkpoint payload and internal fingerprints;
- [x] compatibility payload integrity;
- [x] complete active journal chain and current tail;
- [x] all receipt result hashes and JSON;
- [x] committed run/save revision links;
- [x] latest committed run link from save;
- [x] active-run cardinality check;
- [x] no silent repair;
- [x] no automatic restore;
- [x] application corruption reopens read-only;
- [x] recovery status reports `corrupted`;
- [x] mutation commands reject with `RecoveryRequired`;
- [x] newer schema remains distinct from corruption;
- [x] backup availability included in recovery status.

### TypeScript application adapter

- [x] platform-independent invoke port;
- [x] exact command-name registry;
- [x] outgoing command parsing;
- [x] incoming response parsing;
- [x] request ID preserved across retry;
- [x] no Tauri package dependency in `game-application`;
- [x] backup and recovery service methods.

## 1.2. Implemented verification

- [x] TypeScript exact command/argument mapping;
- [x] TypeScript request-ID retry preservation;
- [x] TypeScript unknown response rejection;
- [x] file-backed backup creation;
- [x] backup read-only reopen;
- [x] backup receipt replay;
- [x] unclean-but-valid reopen;
- [x] tampered authoritative save detection;
- [x] corrupted read-only worker mode;
- [x] mutation rejection in recovery mode;
- [x] SQL-trigger failure after save CAS proves full transaction rollback;
- [x] child-process immediate exit after commit/before acknowledgement;
- [x] reopen after process exit observes exactly one committed revision;
- [x] same request ID after acknowledgement loss returns duplicate receipt.

## 1.3. Deliberate change to the earlier crash plan

The earlier roadmap listed eleven internal failpoints. PR #18 now uses two higher-value mechanisms:

1. an SQLite trigger aborts the run update after the save CAS inside the same transaction;
2. a child process exits immediately after a successful commit and before acknowledgement.

These prove the two material risks:

- partial transaction visibility;
- committed transaction with lost response.

Adding a project-wide failpoint framework for every SQL statement is deferred until a real defect or migration requires finer localization. The current tests exercise actual SQLite rollback/process semantics without adding production hooks.

## 1.4. Backup-before-migration decision

Migration v1 only creates a new database. There is no supported older Runtime Human schema to upgrade.

Therefore:

- [x] low-level verified Online Backup mechanism exists;
- [ ] connect it to migration upgrade orchestration immediately before migration v2 is introduced;
- [ ] add v1-to-v2 fixture and kill/reopen test in the same PR as migration v2.

This is a hard prerequisite for migration v2, not a reason to add unreachable upgrade code to PR #18.

## 1.5. Remaining before PR #18 merge

Only completion gates remain:

1. [ ] run current permanent read-only Windows workflow;
2. [ ] fix only observed format/type/compile/test failures;
3. [ ] update design and implementation plans to final identifiers;
4. [ ] regenerate docs catalog/manifest after the final documentation change;
5. [ ] inspect final diff for duplicate/stale contracts and temporary CI code;
6. [ ] perform explicit adversarial checklist review;
7. [ ] request automated review;
8. [ ] resolve Critical/Important findings;
9. [ ] rerun the complete read-only Windows workflow on unchanged head;
10. [ ] mark ready for review;
11. [ ] squash merge with expected head SHA;
12. [ ] verify `main` workflow result.

No PR #19 implementation enters this branch.

---

# 2. PR #19 — Persisted MonthRun application orchestration

## Goal

Connect the pure MonthRun kernel from PR #17 to the durable commands from PR #18. A single application operation must survive restart and acknowledgement loss without rerunning deterministic work unnecessarily.

## Exact work sequence

### P19-01 — Application persistence actor

Files:

```text
packages/game-application/src/month-run/
├── persisted-month-run-actor.ts
├── persisted-month-run-state.ts
├── persisted-month-run-effects.ts
└── persisted-month-run-errors.ts
```

Responsibilities:

- load save and active run;
- begin a new run only when none exists;
- run the pure kernel to a durable boundary;
- persist the boundary before exposing it to UI;
- preserve request IDs until a receipt confirms the operation;
- never mix persistence and gameplay calculations.

### P19-02 — Startup recovery state machine

Closed states:

```text
loading
no-save
ready-to-start
resuming
awaiting-decision
completed-uncommitted
committing
committed
read-only-incompatible
recovery-required
failed
```

Rules:

- suspended run resumes from stored checkpoint;
- completed run offers/retries commit without rerunning the month;
- duplicate begin/store/commit responses are success-equivalent;
- corrupt/incompatible persistence status blocks gameplay mutations;
- transient transport failure retains the same request ID.

### P19-03 — Command envelope builder

Build canonical persistence payloads from actual pure-core checkpoint bytes:

- exact checkpoint JSON;
- exact SHA-256;
- internal checkpoint hash;
- expected durable source revision/hash;
- committed checkpoint produced by reducer;
- final save snapshot/result.

No second serializer is allowed to create save compatibility.

### P19-04 — Restart matrix

Required cases:

- restart after ready boundary;
- restart after suspended boundary;
- restart after decision acceptance and before next boundary acknowledgement;
- restart after completed boundary;
- restart after commit and before response;
- stale save revision;
- stale run revision;
- stale serialized checkpoint hash;
- stale internal checkpoint hash;
- recovery-required database.

### P19-05 — End-to-end acceptance

One seeded January MonthRun must:

1. create/load save;
2. begin persisted run;
3. reach a decision;
4. close desktop process;
5. reopen;
6. answer with the same deterministic context;
7. complete;
8. commit once;
9. reopen again;
10. show the committed save and no active run.

Merge gate:

- full Windows workflow;
- restart matrix green;
- no UI feature scope beyond minimal orchestration evidence.

---

# 3. PR #20 — Deterministic compiled content foundation

Execution order:

1. source JSONC contracts;
2. JSON Schema 2020-12 definitions;
3. Ajv build-only validation;
4. source-location diagnostics through `jsonc-parser`;
5. reference graph;
6. chronology rules;
7. reachability rules;
8. provenance registry;
9. deterministic sorted registry output;
10. content fingerprint;
11. lazy era/domain chunks;
12. deterministic regeneration CI gate.

Acceptance:

- byte-identical output from identical sources;
- invalid fixture for every compiler phase;
- no runtime JSONC/Ajv dependency in initial renderer;
- January 1990 chunk load does not include later eras;
- chunk loading cannot alter candidate ordering or RNG call count.

---

# 4. PR #21 — Cross-runtime determinism hardening

Keep the existing Xoshiro256** implementation.

Add:

- official/independent test vectors;
- Node/WebView/Rust parity fixture;
- RNG state restore/fork parity;
- authoritative RNG call-count trace;
- deterministic candidate ordering trace;
- boundary rule forbidding `Math.random()` in authoritative packages;
- separate RNG scopes for content, outcome, narrative and NPC selection.

Merge gate:

- same seed/content/rules produces the same checkpoint and save fingerprints across all supported runtimes.

---

# 5. PR #22–#25 — NPC/social simulation

## PR #22 — Person state and directed relationships

- three fidelity tiers: active/background/archived;
- stable person IDs;
- directed relationship dimensions;
- traits, hooks, role, organization and bounded goals;
- no daily whole-population simulation.

## PR #23 — Typed memory and beliefs

- typed memory facts;
- source event IDs;
- salience, relevance and recency scores;
- deterministic compaction;
- bounded ledger;
- beliefs with confidence/source memories;
- no natural-language authoritative memory or embeddings.

## PR #24 — Utility social actions

- closed action definitions;
- eligibility predicates;
- integer/fixed-point score trace;
- role/goal/relationship/memory/obligation modifiers;
- stable priority and ID tie-break;
- scoped RNG only after full deterministic equality.

## PR #25 — Social storylets and Narrative Director

- participant roles;
- prerequisites;
- scoring modifiers;
- choices;
- typed effect proposals;
- memory outputs;
- cooldown and anti-repeat key;
- participant-recency and same-NPC streak controls;
- Director selects among valid candidates but cannot create invalid effects.

Cross-PR merge gate:

- deterministic snapshots;
- bounded memory/state;
- no NPC system can bypass provider ownership;
- no relationship state creates a permanent progression soft lock;
- programmer gameplay remains primary.

---

# 6. PR #26–#28 — First playable January 1990 slice

## PR #26 — Content

- guardian, mentor and peer active NPCs;
- 2–5 background people;
- computer-access storylet;
- ask-for-help storylet;
- shared experiment;
- conflicting advice;
- first programming/project outcomes;
- provenance and chronology evidence.

## PR #27 — Balance simulation

Run deterministic multi-seed simulations for:

- event/NPC repetition;
- relationship farming;
- mentor dependency;
- help versus solo capability evidence;
- memory bounds;
- progression distributions;
- recovery from negative relationships;
- programmer-first event share;
- identical-seed history equality.

## PR #28 — Desktop vertical slice

- load/create save;
- run month;
- decision presentation;
- close/reopen recovery;
- commit summary;
- persistence/recovery status UX;
- minimal diagnostics/export affordance;
- performance and memory measurement.

Definition of first playable:

- a user can complete January 1990, close at any durable boundary, reopen and continue without state loss or duplicate progression.

---

# 7. Global execution constraints

- one active implementation PR at a time until the first playable slice;
- every PR starts from updated `main`;
- no stacked base branches after a squash merge;
- production behavior before broad test frameworks;
- tests target compatibility, crash, determinism and ownership boundaries;
- no unrelated dependency upgrades;
- no generic abstractions without two current call sites;
- no runtime LLM authority;
- no arbitrary renderer SQL;
- no nondeterministic time/randomness in authoritative state;
- no merge without an unchanged green head and resolved Critical/Important review findings.
