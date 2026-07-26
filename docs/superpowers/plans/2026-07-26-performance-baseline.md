---
title: "OPT-00 Performance Baseline Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-07-26
---

# OPT-00 Performance Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a reproducible, warning-only performance baseline for the published January 1990 application workload before changing runtime, persistence, CI, or compiler architecture.

**Architecture:** A shell-free Node launcher runs one opt-in Vitest benchmark file. The benchmark measures published compiled-content loading and deterministic January application operations over the existing in-memory persistence harness, emits a versioned JSON artifact with host metadata and p50/p95/p99 summaries, and never fails solely because a preliminary target is exceeded. File-backed SQLite, WebView2 startup, idle wakeups, and WPR/WPA capture remain separate follow-up slices.

**Tech Stack:** Node 24, TypeScript 7, Vitest 4, existing Runtime Human production packages and January test harness, `node:perf_hooks`, `node:os`, `node:fs/promises`.

## Global Constraints

- Preserve deterministic TypeScript Game Core and Xoshiro256**.
- Preserve direct `rusqlite`, `BEGIN IMMEDIATE`, WAL, `synchronous=FULL`, dual CAS, receipts, journal, and atomic MonthRun commit.
- Do not introduce runtime JSONC, Ajv, LLM authority, generic SQL, a connection pool, or a benchmark framework dependency.
- Baseline results are warning-only; no absolute performance gate is allowed in this slice.
- Clearly label the application benchmark as in-memory persistence so it cannot be misreported as SQLite or Tauri latency.
- Generated performance artifacts are local/CI outputs and must not be committed.

---

### Task 1: Close the January source-of-truth state

**Files:**
- Modify: `docs/EXECUTION-STATUS.jsonc`

**Interfaces:**
- Consumes: PR #32 merge commit `12c25f7cde70a10fedcf3ecac6361a12ef63c0e8` and closed issue #22.
- Produces: canonical status showing January complete and OPT-00 active.

- [ ] **Step 1: Mark `january-1990-hardening-and-closure` complete**

Set its merge commit, change the acceptance audit to `complete`, and remove branch-only pending language.

- [ ] **Step 2: Add `performance-baseline` as the current milestone**

Record issue #24, branch `agent/perf-opt-00-baseline`, warning-only policy, and the exact scenarios introduced by this plan.

- [ ] **Step 3: Update verification state**

Set the current constraint to OPT-00 implementation and keep merge prohibited until one unchanged head passes permanent gates and review.

### Task 2: Add deterministic duration summaries

**Files:**
- Create: `scripts/performance/performance-summary.ts`
- Test: `tests/performance-summary.test.ts`

**Interfaces:**
- Produces: `summarizeDurations(samples)` and `classifyWarningOnlyBudget(summary, p95BudgetMs)`.

- [ ] **Step 1: Write failing percentile and validation tests**

Cover nearest-rank p50/p95/p99, mean rounding, empty input, negative/non-finite samples, warning, within-target, and unbudgeted results.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm exec vitest run tests/performance-summary.test.ts`
Expected: FAIL because `scripts/performance/performance-summary.ts` does not exist.

- [ ] **Step 3: Implement the minimal summary module**

Use sorted copies, nearest-rank percentiles, millisecond values rounded to three decimals, and closed status values `within-target | warning | unbudgeted`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `pnpm exec vitest run tests/performance-summary.test.ts`
Expected: all tests pass.

### Task 3: Add the January application benchmark

**Files:**
- Create: `tests/january-1990-application-baseline.perf.test.ts`
- Create: `scripts/run-january-performance-baseline.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `loadJanuaryTestRegistry`, `createHarnessedJanuaryRuntime`, `startJanuary`, `resumeJanuary`, `requireJanuaryWaiting`, `requireJanuaryCommitted`.
- Produces: `artifacts/performance/january-application-baseline.json` with schema `runtime-human-performance-baseline-v1`.

- [ ] **Step 1: Add an opt-in benchmark test**

Skip during ordinary `pnpm test` unless `RUNTIME_HUMAN_PERF_BASELINE=1`. Measure:

1. `content.load_registry.warm_process`;
2. `month.begin_to_access.in_memory`;
3. `month.resume_access_to_learning.in_memory`;
4. `month.resume_learning_to_defect.in_memory`;
5. `month.resume_defect_to_commit.in_memory`;
6. `month.full_cycle.in_memory`.

Use five warmups and thirty measured samples by default. Construct fresh runtime state outside each timed operation and use fixed seed 42.

- [ ] **Step 2: Emit versioned JSON and a readable console table**

Include UTC generation time, commit/environment identifier, Windows/CPU/memory/Node metadata, benchmark scope, configuration, scenario summaries, preliminary p95 targets where applicable, and warning-only status.

- [ ] **Step 3: Add a shell-free launcher**

Use `startVitest` from `vitest/node`; do not use `cmd.exe`, `ComSpec`, `shell: true`, or string command construction.

- [ ] **Step 4: Add repository command and ignore generated artifacts**

Add `perf:january:baseline` and ignore `artifacts/performance/`.

- [ ] **Step 5: Run the benchmark smoke path**

Run: `pnpm perf:january:baseline -- --warmups=1 --samples=2`
Expected: JSON artifact created, six scenarios printed, process exit 0 even when a target is exceeded.

### Task 4: Document budgets and profiling protocol

**Files:**
- Create: `docs/performance/PERFORMANCE-BUDGETS.md`
- Create: `docs/performance/PROFILING-RUNBOOK.md`

**Interfaces:**
- Produces: canonical distinction between targets, baselines, and gates; exact commands for reproducible Windows measurements.

- [ ] **Step 1: Record preliminary targets from issue #24**

Preserve startup, interaction, persistence queue, durable boundary, idle CPU, memory growth, bundle growth, and CI targets. Label them provisional until hardware-backed baselines exist.

- [ ] **Step 2: Define benchmark taxonomy**

Separate application/in-memory, Rust/file-backed SQLite, Tauri IPC, WebView2 startup, compiler, and OS-level WPR/WPA measurements. Prohibit comparing unlike scopes.

- [ ] **Step 3: Write the runbook**

Document clean checkout, tool versions, power plan, foreground/background process controls, cold versus warm definitions, sample counts, artifact naming, and interpretation rules.

- [ ] **Step 4: Define follow-up order**

1. Rust file-backed persistence timings;
2. Tauri/WebView2 first meaningful paint;
3. idle CPU/wakeups/memory;
4. CI/compiler baselines;
5. only then measured optimizations.

### Task 5: Regenerate documentation indexes and verify

**Files:**
- Modify: `docs/MANIFEST.jsonc`
- Modify: `docs/CATALOG.md`

- [ ] **Step 1: Regenerate derived documentation**

Run: `node scripts/build-toc.mjs`

- [ ] **Step 2: Format all changed files**

Run: `pnpm fmt` and `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all`.

- [ ] **Step 3: Run focused verification**

Run:

```text
pnpm docs:check
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm exec vitest run tests/performance-summary.test.ts
pnpm perf:january:baseline -- --warmups=1 --samples=2
```

- [ ] **Step 4: Run permanent repository gates**

Run the existing foundation workflow on one unchanged head, then review Sonar and external review findings before merge.
