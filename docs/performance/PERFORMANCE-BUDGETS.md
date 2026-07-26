---
title: "Runtime Human — performance budgets"
type: engine
status: draft
canon: true
updated: 2026-07-26
---

# Runtime Human — performance budgets

## Purpose

These budgets define the target envelope for Runtime Human. They are **not release gates yet**. OPT-00 records reproducible baselines first; a later PR may promote a metric to a gate only after the scenario, hardware profile, sample count and variance policy are stable.

A target exceedance in the current baseline is reported as `warning`. It must not fail CI or justify an architectural rewrite by itself.

## Scope taxonomy

Numbers from different scopes must not be compared as though they measure the same path.

| Scope | Includes | Excludes |
|---|---|---|
| `published-compiled-content` | file read, compiled artifact parse, fingerprint verification, registry publication | authoring compiler, browser fetch, WebView2, SQLite |
| `application-in-memory-persistence` | January application/core orchestration and the repository in-memory persistence harness | Tauri IPC, Rust worker, SQLite durability, WebView2 |
| `rust-file-backed-sqlite` | typed persistence command, dedicated worker, WAL/file I/O, reopen | Tauri serialization and renderer |
| `tauri-ipc` | frontend invoke, serde boundary, command dispatch and response | WebView2 startup and user paint |
| `webview2-startup` | process launch through first meaningful paint | content authoring and CI build time |
| `content-compiler` | source discovery, validation, materialization and artifact writing | runtime loading |
| `windows-os` | idle CPU, wakeups, handles, threads, private working set, GPU memory | synthetic unit-test timings |

## Preliminary targets

These values come from PERF-01 and remain provisional until OPT-00/OPT-09 evidence exists.

| Metric | Preliminary target | Intended scope |
|---|---:|---|
| Cold process start → first meaningful paint | p50 ≤ 1.2 s; p95 ≤ 2.5 s | `webview2-startup` |
| Warm start → first meaningful paint | p50 ≤ 0.7 s; p95 ≤ 1.5 s | `webview2-startup` |
| UI input feedback | p95 ≤ 100 ms | renderer interaction |
| Ordinary interactive operation | p95 ≤ 200 ms | end-to-end user operation |
| Persistence queue wait | p95 ≤ 5 ms; p99 ≤ 25 ms | `rust-file-backed-sqlite` / `tauri-ipc` |
| Warm persisted month context load | p95 ≤ 25 ms; p99 ≤ 75 ms | file-backed SQLite + application |
| Durable boundary on SSD | p95 ≤ 30 ms; p99 ≤ 100 ms | `rust-file-backed-sqlite` |
| Idle CPU | approximately 0%; no periodic 100 ms polling | `windows-os` |
| Queue depth | p99 < 4 | persistence worker |
| Initial renderer bundle | ≤ 5% growth per PR without waiver | renderer build |
| 100 month cycles | private working set growth ≤ 5 MiB after stabilization | `windows-os` |
| Fast PR gate | ≤ 5 minutes on the current self-hosted runner | CI |
| Full merge gate | ≤ 10 minutes or equivalent parallel critical path | CI |
| Incremental content build, one source | orientation ≤ 150 ms after warm cache | `content-compiler` |
| Full compiler fixture, 10k entries | orientation ≤ 2 s on the CI runner | `content-compiler` |

## OPT-00A January application targets

The first repository command measures only the application/in-memory path. It applies the broad `ordinary interactive operation` target to individual begin/resume operations and intentionally leaves content loading and the full four-operation month cycle unbudgeted.

| Scenario | p95 target | Enforcement |
|---|---:|---|
| `month.begin_to_access.in_memory` | 200 ms | warning-only |
| `month.resume_access_to_learning.in_memory` | 200 ms | warning-only |
| `month.resume_learning_to_defect.in_memory` | 200 ms | warning-only |
| `month.resume_defect_to_commit.in_memory` | 200 ms | warning-only |
| `content.load_registry.warm_process` | none yet | unbudgeted |
| `month.full_cycle.in_memory` | none yet | unbudgeted |

These measurements are useful for regression direction and application overhead. They must not be cited as SQLite, Tauri, first-paint or cold-start latency.

## OPT-00B file-backed SQLite targets

The second repository command measures one production `PersistenceHandle` operation at a time against a fresh temporary SQLite file. Preparation of the required January state is excluded from the timed interval.

| Scenario | p95 target | Enforcement |
|---|---:|---|
| `db.start.new_file` | none yet | unbudgeted |
| `db.start.clean_existing` | none yet | unbudgeted |
| `save.create` | 30 ms | warning-only |
| `save.load` | 25 ms | warning-only |
| `month.begin` | 30 ms | warning-only |
| `month.boundary.pc2` | 30 ms | warning-only |
| `month.boundary.pc4` | 30 ms | warning-only |
| `month.boundary.pc7` | 30 ms | warning-only |
| `month.boundary.pc9` | 30 ms | warning-only |
| `month.commit` | 30 ms | warning-only |
| `month.commit.duplicate_receipt` | 25 ms | warning-only |
| `month.load_active.after_clean_reopen` | 25 ms | warning-only |
| `db.shutdown.clean` | none yet | unbudgeted |

The command preserves WAL, `synchronous=FULL`, `BEGIN IMMEDIATE`, the single worker, CAS and durable receipts. A warning cannot change its exit status and is not permission to weaken durability.

## Promotion to an enforced gate

A metric can become enforced only when all conditions are met:

1. the scenario has a stable versioned schema and exact scope;
2. the command records OS, CPU, memory, Node/Rust versions and source revision;
3. warmup/sample counts and percentile method are fixed;
4. at least three independent baseline runs show acceptable variance;
5. expected environmental noise is documented;
6. the target is based on actual user impact or an observed regression, not preference;
7. the gate has an explicit waiver and expiry process.

## Non-negotiable invariants

Performance work must not weaken:

- deterministic Xoshiro256** execution and versioned manifest;
- canonical JSON and domain-separated SHA-256;
- Rust-owned persistence;
- direct `rusqlite`, `BEGIN IMMEDIATE`, WAL and `synchronous=FULL`;
- revision + payload SHA + checkpoint hash CAS;
- durable receipts and hash-linked journal;
- atomic save/run/result commit;
- build-time compiled content;
- the prohibition on runtime JSONC/Ajv/LLM authority.
