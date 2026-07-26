---
title: "OPT-00B File-backed SQLite Baseline Plan"
type: plan
status: implementation-complete
canon: true
updated: 2026-07-26
---

# OPT-00B File-backed SQLite Baseline Plan

**Goal:** Measure the real January persistence fixture through the production `PersistenceHandle` and file-backed SQLite worker without changing persistence behavior.

**Architecture:** A test-only Rust measurement module prepares a fresh temporary database for every sample, keeps setup outside the timed region, executes one production worker operation, and emits a warning-only versioned JSON report. A shell-free Node launcher supplies host metadata and invokes the single opt-in Rust test.

**Preserved invariants:** direct `rusqlite`, one dedicated worker, bounded queue, `BEGIN IMMEDIATE`, WAL, `synchronous=FULL`, revision/hash CAS, receipts, journal, recovery and atomic commit.

## Task 1 — RED contracts

- Add a test-only persistence performance module boundary.
- Require nearest-rank integer-microsecond summaries.
- Require a versioned report over the production January persistence fixture.
- Keep ordinary `cargo test` fast by returning early unless explicitly enabled.

## Task 2 — Measurement scenarios

Measure separately:

1. new database worker start;
2. clean existing database worker start;
3. canonical save create;
4. save load;
5. MonthRun begin;
6. PC2 durable boundary;
7. PC4 durable boundary;
8. PC7 durable boundary;
9. PC9 completed boundary;
10. final commit;
11. duplicate commit receipt replay;
12. active MonthRun load after controlled reopen;
13. controlled shutdown.

Each measured sample gets an independent temporary directory and exact production fixture commands. Warmup/setup operations are excluded from the measured interval.

## Task 3 — Report and launcher

- Emit `runtime-human-sqlite-performance-baseline-v1`.
- Store integer microseconds for min/mean/p50/p95/p99/max.
- Record host/source metadata, sample configuration and durability configuration.
- Apply preliminary p95 targets as `warning-only`; no threshold may fail the command.
- Add `pnpm perf:january:sqlite` using direct `cargo` process execution with no command shell.
- Write generated reports under ignored `artifacts/performance/`.

## Task 4 — Source of truth and verification

- Mark PR #34/OPT-00A complete in `EXECUTION-STATUS`.
- Mark OPT-00B implementation state and explicit exclusions.
- Update performance budgets/runbook with the new command and scenario taxonomy.
- Regenerate docs indexes and format.
- Verify focused Rust tests, opt-in smoke, permanent repository gates, Sonar and review before merge.
