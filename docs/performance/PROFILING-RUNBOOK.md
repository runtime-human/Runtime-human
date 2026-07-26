---
title: "Runtime Human — profiling runbook"
type: engine
status: draft
canon: true
updated: 2026-07-26
---

# Runtime Human — profiling runbook

## Principles

1. Measure before optimizing.
2. Record the exact source revision and hardware/software profile.
3. Compare only identical scenarios and scopes.
4. Keep cold, warm-process, warm-OS-cache and warm-application results separate.
5. Do not turn preliminary targets into pass/fail gates.
6. Preserve durability, determinism and recovery invariants while profiling.

## Required environment record

Every shared result must include:

- Git commit or PR head SHA;
- Windows edition/build and architecture;
- CPU model and logical-core count;
- installed memory;
- power plan and whether the machine was on AC power;
- Node, pnpm, Rust and Cargo versions relevant to the scenario;
- self-hosted runner name when executed in Actions;
- warmup and measured sample counts;
- foreground/background processes that materially affect the run.

The January baseline command records OS, CPU, memory, Node, runner and sample configuration automatically.

## January application baseline

### Default run

```powershell
pnpm install --frozen-lockfile
pnpm content:check
pnpm perf:january:baseline -- --commit=$(git rev-parse HEAD)
```

Default configuration:

- 5 warmups per scenario;
- 30 measured samples per scenario;
- fixed January seed 42;
- output: `artifacts/performance/january-application-baseline.json`;
- warning-only target classification.

### Fast smoke run

```powershell
pnpm perf:january:baseline -- --warmups=1 --samples=2 --commit=$(git rev-parse HEAD)
```

### Custom artifact path

```powershell
pnpm perf:january:baseline -- --output=artifacts/performance/pr-34-run-1.json
```

### Scenarios

| Scenario | What is timed | Setup excluded from timing |
|---|---|---|
| `content.load_registry.warm_process` | published manifest/chunk reads, parse, verification and registry publication | Vitest startup |
| `month.begin_to_access.in_memory` | begin through first player boundary | content registry load and fresh harness construction |
| `month.resume_access_to_learning.in_memory` | accepting access decision through learning boundary | fresh harness and access-boundary preparation |
| `month.resume_learning_to_defect.in_memory` | accepting learning decision through defect boundary | fresh harness and earlier boundaries |
| `month.resume_defect_to_commit.in_memory` | accepting defect response through atomic application-level commit result | fresh harness and earlier boundaries |
| `month.full_cycle.in_memory` | all four January application operations | fresh harness and content registry load |

The MonthRun scenarios use the repository in-memory persistence harness. They are not evidence for SQLite, Tauri IPC or power-loss durability latency.

## Reproducible comparison procedure

1. Use a clean checkout at the exact commit being measured.
2. Run `pnpm install --frozen-lockfile` once before all compared runs.
3. Run `pnpm content:check`; do not benchmark stale generated content.
4. Close IDE indexing, browsers, games, package installs and backup tools when collecting a reference result.
5. Keep the same Windows power plan and AC/battery state.
6. Execute three full baseline runs.
7. Preserve all JSON artifacts; do not average already-calculated percentiles.
8. Compare scenario p50/p95/p99 and sample distributions only against the same scenario schema.
9. Treat a single warning as an investigation signal, not a regression verdict.
10. Re-run after reboot or on a second machine before proposing an architectural optimization.

## Cold and warm definitions

- **Warm process:** same process and loaded code; repeated operation samples. The current January baseline uses this model for published content loading.
- **Warm OS cache:** new process, filesystem pages likely cached by Windows.
- **Cold application:** new process with no initialized Runtime Human state; OS cache may still be warm.
- **Cold OS cache:** requires controlled system-level preparation and must never be inferred from a first iteration alone.
- **First meaningful paint:** the first frame showing the actionable January screen, not merely WebView creation or HTML load.

## File-backed SQLite follow-up

The next OPT-00 slice must add a dedicated Rust measurement command for:

- clean database open;
- unclean/recovery database open;
- create/load save;
- begin MonthRun;
- PC2/PC4/PC7/PC9 durable boundaries;
- final commit;
- duplicate receipt replay;
- controlled shutdown and reopen.

It must use a real temporary database file and preserve WAL + `synchronous=FULL`. It must not switch to `:memory:`, disable fsync or change transaction semantics to obtain better numbers.

## Tauri and WebView2 follow-up

Measure separately:

1. process creation;
2. Rust/Tauri setup;
3. WebView2 initialization;
4. renderer script evaluation;
5. React commit;
6. compiled-content load;
7. save bootstrap/load;
8. first meaningful paint.

Use explicit marks/spans rather than inferring component latency from one total. Do not clear WebView2 cache for ordinary warm-start measurements.

## Windows WPR/WPA capture follow-up

A later PR should add repository-owned PowerShell wrappers for Windows Performance Recorder profiles covering:

- CPU sampling;
- disk/file I/O;
- process/thread lifetime;
- working set/private bytes;
- context switches and wakeups;
- WebView2 child processes.

The wrapper must record the exact command, duration, source revision and output file. WPR collection is manual/nightly evidence, not a normal PR gate.

## Interpretation rules

- Compare p95 for user-facing responsiveness; p99 is diagnostic until enough samples exist.
- Use p50 to detect broad shifts and p95/p99 to identify tail regressions.
- Inspect raw sample count and host profile before drawing conclusions.
- A faster application/in-memory result cannot justify changing SQLite durability settings.
- A CI duration improvement is not a product runtime improvement.
- Bundle size, startup, persistence latency and idle resource use require separate evidence.

## Follow-up order

1. Rust file-backed persistence baseline.
2. Tauri IPC and WebView2 first meaningful paint.
3. Windows idle CPU, wakeups, handles, threads and memory.
4. Content compiler and CI duration baselines.
5. Only then implement the highest-value measured optimization.
