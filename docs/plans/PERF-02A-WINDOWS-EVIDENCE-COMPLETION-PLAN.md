---
title: "PERF-02A Windows Evidence Completion Plan"
type: plan
status: draft
canon: true
updated: 2026-07-29
---

# PERF-02A Windows Evidence Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete PERF-02A with a trustworthy Windows capture/report pipeline, collect comparable evidence, and publish exactly one measured optimization recommendation.

**Architecture:** Phase E1 owns dependency-free validation and aggregation of versioned capture files. Phase E2 owns an isolated evidence-only WebdriverIO/Tauri harness that captures Rust, browser, and external monotonic timelines without entering production builds. Phase E3 runs a controlled Windows matrix, feeds raw captures into E1, and chooses one next optimization or explicitly requests more evidence.

**Tech Stack:** Node 24, TypeScript 7, Vitest 4, Tauri 2, Rust 1.97.1, existing `runtime-human-desktop-performance-snapshot-v1`, browser User Timing, self-hosted Windows evidence host; WebdriverIO and `@wdio/tauri-service` only in Phase E2.

## Global Constraints

- Preserve deterministic TypeScript Game Core, Xoshiro256**, canonical JSON, and domain-separated SHA-256.
- Preserve direct `rusqlite`, one dedicated worker/connection, `sync_channel(64)`, WAL, `synchronous=FULL`, `BEGIN IMMEDIATE`, dual CAS, receipts, journal, and atomic MonthRun commit.
- Rust `Instant`, browser `performance.now()`, and external harness time have different origins and must never be subtracted across domains.
- Generated captures and reports stay under ignored `artifacts/performance/` and are never authoritative state.
- Performance targets are warning-only and cannot fail correctness gates or weaken durability.
- No network analytics, arbitrary benchmark names, user payloads, raw SQL, save IDs, paths, or free-form error text.
- One production WebView; evidence-only plugins and capabilities must not enter normal builds.
- PERF-02A ends with one recommendation, not multiple parallel optimizations.

---

### Task 1: Repair the E1 metric model

**Files:**
- Modify: `scripts/performance/desktop-evidence-contract.mjs`
- Modify: `scripts/performance/desktop-evidence-contract.d.mts`
- Test: `tests/desktop-performance-evidence.test.ts`

**Interfaces:**
- Consumes: parsed `runtime-human-desktop-performance-capture-v1` captures.
- Produces: every duration observation as `metricName -> number[]`; group summaries flatten all observations while missing counts remain capture-based.

- [x] **Step 1: Add failing duplicate-span tests**

Add two query queue-wait/database spans to one capture and verify the report contains every observation instead of only the first.

- [x] **Step 2: Run focused test and confirm RED**

Run: `pnpm exec vitest run tests/desktop-performance-evidence.test.ts`

Expected: duplicate-span count/percentiles fail against the current scalar metric map.

- [x] **Step 3: Store arrays at extraction time and flatten at group time**

`extractMetrics` must return `Map<string, number[]>`. `pushMetric` always appends. `summarizeGroup` appends every value and tracks per-capture metric presence separately from observation count.

- [x] **Step 4: Run focused test and confirm GREEN**

Run the same command; expected all evidence tests pass.

### Task 2: Enforce closed semantic event shapes

**Files:**
- Modify: `scripts/performance/desktop-evidence-contract.mjs`
- Modify: `scripts/performance/desktop-evidence-contract.d.mts`
- Test: `tests/desktop-performance-evidence.test.ts`

**Interfaces:**
- Produces: startup Rust events only as marks; operation Rust events only as spans; renderer milestones only as marks; content/month operations only as measures.

- [x] **Step 1: Add failing semantic-shape tests**

Reject `processEntry` with a duration, `persistenceQueueWait` without duration/category/operation ID, renderer milestone as a measure, and `month.load` as a mark.

- [x] **Step 2: Confirm RED**

Run the focused evidence test and verify failures are caused by currently accepted invalid shapes.

- [x] **Step 3: Implement exact shape validators**

Split Rust names into mark/span sets and browser names into mark/measure sets. Enforce nullability and queue-depth rules without accepting a generic `.none` category.

- [x] **Step 4: Confirm GREEN**

Run the focused test; all semantic-shape cases pass.

### Task 3: Prevent biased reports and add warning-only budgets

**Files:**
- Modify: `scripts/performance/desktop-evidence-contract.mjs`
- Modify: `scripts/performance/desktop-evidence-contract.d.mts`
- Test: `tests/desktop-performance-evidence.test.ts`

**Interfaces:**
- Produces: unique capture identity and optional metric budget summaries with `within-target | warning | unbudgeted`.

- [x] **Step 1: Add failing duplicate-identity and budget tests**

Reject duplicate `scenario + classification + sampleIndex` captures. Verify cold/warm process-to-FMP and queue-wait p95/p99 use the canonical warning-only targets.

- [x] **Step 2: Confirm RED**

Run the focused test; duplicate captures are currently accepted and metric summaries contain no budget result.

- [x] **Step 3: Implement identity and budget classification**

Use microsecond thresholds from `docs/performance/PERFORMANCE-BUDGETS.md`. Never change process exit status because of a warning.

- [x] **Step 4: Confirm GREEN**

Run the focused evidence test and inspect exact summaries.

### Task 4: Prove the report CLI end to end

**Files:**
- Modify: `scripts/run-desktop-performance-evidence.mjs`
- Test: `tests/desktop-performance-evidence-cli.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm evidence:desktop:report -- --input=<file> --output=<file>`.

- [x] **Step 1: Add a failing CLI integration test**

Create temporary capture files, execute the Node CLI without a shell, and assert deterministic report JSON and exit code 0.

- [x] **Step 2: Confirm RED**

Run: `pnpm exec vitest run tests/desktop-performance-evidence-cli.test.ts`

- [x] **Step 3: Make the CLI importable and keep executable entry behavior**

Expose argument parsing and `runDesktopEvidenceCli`; retain the direct Node entry point and clear errors for missing/unknown arguments.

- [x] **Step 4: Confirm GREEN and smoke command**

Run both focused tests and one repository smoke invocation with temporary inputs.

### Task 5: Close and merge E1

**Files:**
- Modify: `docs/plans/PERF-02A-WINDOWS-EVIDENCE-IMPLEMENTATION-PLAN.md`
- Modify: `docs/EXECUTION-STATUS.jsonc` after merge only
- Regenerate: `docs/CATALOG.md`, `docs/MANIFEST.jsonc`

- [ ] **Step 1: Format and regenerate docs**

Run `pnpm fmt` and `node scripts/build-toc.mjs`.

- [ ] **Step 2: Run full unchanged-head verification**

Run docs, formatting, lint, typecheck, complete Vitest suite, renderer/Storybook build, Rust formatting/check/tests, and review Sonar/review threads.

- [ ] **Step 3: Merge PR #67 only on unchanged green head**

Squash merge with the capture/report contract only; no WebDriver dependency in E1.

- [ ] **Step 4: Record E1 in issue #51 and execution ledger**

Close the E1 plan status and leave PERF-02A open for the real Windows harness and evidence.

### Task 6: Build the isolated E2 Windows harness

**Files:**
- Create: `tools/desktop-evidence/package.json`
- Create: `tools/desktop-evidence/tsconfig.json`
- Create: `tools/desktop-evidence/wdio.conf.ts`
- Create: `tools/desktop-evidence/src/capture-browser.ts`
- Create: `tools/desktop-evidence/src/capture-rust.ts`
- Create: `tools/desktop-evidence/src/capture-host.ts`
- Create: `tools/desktop-evidence/src/write-capture.ts`
- Create: `tools/desktop-evidence/specs/startup.evidence.ts`
- Modify: `pnpm-workspace.yaml`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: Tauri capabilities/config only for the evidence build

**Interfaces:**
- Consumes: E1 capture schema and existing Rust/browser telemetry.
- Produces: one validated raw capture file per process run.

- [ ] Add WebdriverIO and `@wdio/tauri-service` only to the evidence workspace.
- [ ] Add optional `tauri-plugin-wdio` behind `performance-evidence`; normal builds exclude it.
- [ ] Capture host profile and external monotonic observations in Node.
- [ ] Read browser User Timing through the WebView.
- [ ] Invoke `desktop_get_performance_snapshot_v1` read-only.
- [ ] Validate with E1 before writing each capture.
- [ ] Cover startup shell/FMP and January-ready first; add operation scenarios only after those pass.

### Task 7: Collect E3 evidence and choose one recommendation

**Files:**
- Generated only: `artifacts/performance/raw/*.json`
- Generated only: `artifacts/performance/desktop-performance-evidence.json`
- Create after collection: `docs/performance/PERF-02A-WINDOWS-EVIDENCE.md`
- Modify after collection: `docs/EXECUTION-STATUS.jsonc`, issue #51

- [ ] Collect separate cold-process/warm-process and cold-OS-cache/warm-OS-cache groups.
- [ ] Collect new-database and existing-clean-database groups where applicable.
- [ ] Preserve warmups but exclude them from percentiles.
- [ ] Generate the report with raw samples and p50/p95/p99.
- [ ] Compare process setup, persistence startup, renderer/FMP, January restoration, dispatch, queue, and SQLite contributions.
- [ ] Publish exactly one recommendation or `collect-more-evidence`.
- [ ] Close issue #51 only after evidence and recommendation are recorded.

### Task 8: Resume the product roadmap

- [ ] If shutdown/idle evidence is highest value, implement issue #58 as a separate FIFO shutdown PR.
- [ ] Otherwise open one narrow measured optimization issue and leave #58 deferred.
- [ ] After PERF-02A/PERF-02B stabilization, start NPC foundation before broad UI expansion.
- [ ] Keep UI issue #37 interaction polish and future projections separate from simulation authority.
