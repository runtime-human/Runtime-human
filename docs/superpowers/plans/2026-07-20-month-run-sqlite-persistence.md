---
title: "MonthRun SQLite Persistence Implementation Plan"
type: plan
status: active
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-20
---

# MonthRun SQLite Persistence Implementation Plan

**Goal:** Persist authoritative save snapshots and crash-safe MonthRun boundaries through typed TypeScript contracts, async Tauri commands and a single managed rusqlite writer.

**Architecture:** `game-persistence-contracts` owns public TypeScript DTOs. Rust owns SQLite lifecycle, migrations, transactions, optimistic revisions, idempotency receipts, backup and typed error mapping. Game Core remains pure and Rust never calculates gameplay.

**Tech stack:** TypeScript 7, Vitest 4, Rust 1.97, Tauri 2.11, rusqlite 0.40.1 with bundled SQLite 3.53.2, serde/serde_json, sha2, tempfile.

## Global constraints

- Implement the design in `docs/superpowers/specs/2026-07-20-month-run-sqlite-persistence-design.md`.
- Use TDD: add the focused failing test before production implementation.
- No raw SQL capability in the renderer.
- No gameplay formulas, provider logic, Career/Company schemas or generic workflow engine in Rust.
- No system time in authoritative records.
- Every mutation is one explicit transaction with a durable request receipt.
- Preserve exact canonical JSON bytes and verify SHA-256.
- Keep changes small and independently reviewable.

---

## Task 1: Public persistence contracts

**Files:**
- Modify: `packages/game-persistence-contracts/src/index.ts`
- Create: `tests/persistence-contracts.test.ts`
- Create: `fixtures/persistence/month-run-persistence-v1.json`

- [ ] Write RED tests for canonical payload parsing, bounded IDs/revisions and closed result/error unions.
- [ ] Add `CanonicalPayloadV1`, save records, pending-run records and command/result DTOs.
- [ ] Add parsers that reject unknown schema markers, whitespace IDs, unsafe revisions, invalid hashes and oversized payloads.
- [ ] Add a shared golden JSON fixture consumed later by Rust.
- [ ] Run focused tests, typecheck and boundary check.

## Task 2: Rust DTO parity and payload integrity

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/persistence/mod.rs`
- Create: `apps/desktop/src-tauri/src/persistence/contracts.rs`
- Create: `apps/desktop/src-tauri/src/persistence/payload.rs`

- [ ] Add RED Rust tests that deserialize the shared fixture with `deny_unknown_fields`.
- [ ] Add exact pinned dependencies: rusqlite 0.40.1, serde, serde_json, sha2; tempfile test-only.
- [ ] Validate ID/revision/hash/payload bounds.
- [ ] Parse payload JSON and recompute SHA-256 over exact UTF-8 bytes.
- [ ] Prove TypeScript/Rust fixture parity.

## Task 3: SQLite open gates and schema v1

**Files:**
- Create: `apps/desktop/src-tauri/src/persistence/database.rs`
- Create: `apps/desktop/src-tauri/src/persistence/migrations.rs`

- [ ] Add RED temp-file tests for SQLite version, pragma read-back and idempotent migration.
- [ ] Open bundled SQLite and reject versions below 3.51.3.
- [ ] Apply/verify WAL, NORMAL, foreign keys and five-second busy timeout.
- [ ] Create STRICT schema v1 for saves, pending runs, receipts and committed markers.
- [ ] Run bounded quick check after migration.

## Task 4: Save creation/loading and request receipts

**Files:**
- Create: `apps/desktop/src-tauri/src/persistence/repository.rs`
- Extend: Rust persistence tests

- [ ] Add RED tests for create/load, identical request replay and payload conflict.
- [ ] Implement normalized request serialization and receipt lookup.
- [ ] Create save at revision zero in one immediate transaction.
- [ ] Return stored result for an exact replay.
- [ ] Return `RequestPayloadConflict` for request-ID reuse with different content.

## Task 5: Pending MonthRun boundaries

**Files:**
- Extend: `repository.rs`
- Extend: Rust persistence tests

- [ ] Add RED tests for begin, one-active-run uniqueness, stale save revision and reopen at suspension.
- [ ] Implement begin transaction and durable initial checkpoint.
- [ ] Add active-run load.
- [ ] Add RED tests for boundary update, stale run revision and non-boundary rejection.
- [ ] Store only strictly newer durable checkpoints atomically with receipts.

## Task 6: Atomic commit and crash equivalence

**Files:**
- Extend: `repository.rs`
- Extend: Rust persistence tests

- [ ] Add RED tests for completed-run commit, revision increment and pending deletion.
- [ ] Implement one transaction that updates save, inserts committed marker/result, deletes pending run and inserts receipt.
- [ ] Add exact duplicate replay test.
- [ ] Add a constraint-failure rollback test proving no partial save mutation.
- [ ] Close/reopen before and after commit and compare records.

## Task 7: Online backup foundation

**Files:**
- Create: `apps/desktop/src-tauri/src/persistence/backup.rs`
- Extend: Rust persistence tests

- [ ] Add RED test with a save and suspended run.
- [ ] Create a backup through rusqlite Online Backup API.
- [ ] Reopen destination read-only and run quick/foreign-key checks.
- [ ] Verify save and pending run are present.
- [ ] Keep retention and restore UX deferred.

## Task 8: Async Tauri command surface

**Files:**
- Create: `apps/desktop/src-tauri/src/persistence/commands.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src-tauri/capabilities/default.json` only if command registration requires identifiers; do not grant plugins.

- [ ] Add compile-time/serialization tests for all command DTOs.
- [ ] Build `PersistenceState` around `Arc<Mutex<PersistenceService>>`.
- [ ] Implement owned async commands using `spawn_blocking`.
- [ ] Register commands with `generate_handler!`.
- [ ] Preserve `core:default` and prove no SQL/shell/arbitrary filesystem capability.

## Task 9: TypeScript application adapter

**Files:**
- Modify: `packages/game-platform-contracts/src/index.ts`
- Create: `packages/game-application/src/persistence.ts`
- Modify: relevant package exports/manifests
- Create: `tests/persistence-application.test.ts`

- [ ] Add RED tests with a fake typed invoke port.
- [ ] Convert validated contracts to exact Tauri command names.
- [ ] Keep application code independent of `@tauri-apps/api` through a small invoke port.
- [ ] Map stable Rust errors without leaking paths/SQL.

## Task 10: Dependency lock and cross-platform verification

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.lock`
- Modify: `.github/workflows/foundation.yml` only on the persistence branch when necessary.

- [ ] Generate Cargo.lock on the self-hosted Windows runner.
- [ ] Verify exact dependency versions and licenses.
- [ ] Run `cargo fmt`, `cargo check --locked`, `cargo test --locked`.
- [ ] Run `pnpm check:fast`, type-aware lint, renderer build and Storybook build.
- [ ] Keep workflow actions pinned and credentials non-persistent.

## Task 11: Documentation and final review

**Files:**
- Regenerate: `docs/MANIFEST.jsonc`
- Regenerate: `docs/CATALOG.md`
- Update: `README.md` status if PR #17 is already merged
- Update: persistence docs only where implementation differs from draft wording

- [ ] Regenerate derived docs deterministically.
- [ ] Record implemented scope, dependencies, migrations and deferred work.
- [ ] Run critical self-review against ADR-004/005/007/010/015.
- [ ] Check review threads and external automated review.
- [ ] Require green self-hosted Windows verification before merge.
