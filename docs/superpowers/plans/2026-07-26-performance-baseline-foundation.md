# Performance Baseline Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reproducible, non-authoritative performance measurement layer for the playable January 1990 workload before any optimization is attempted.

**Architecture:** A desktop-owned timing port measures browser content loading and session bootstrap without entering deterministic Game Core state. A repository command runs the real published January content and application flow repeatedly, emits a versioned JSON summary, and can be paired with a Windows system-profile capture. Rust/SQLite semantics, schemas, queues, hashes, receipts and durability settings remain unchanged in this slice.

**Tech Stack:** TypeScript 7, React/Tauri desktop composition, Vitest 4 Node API, Node `performance`, PowerShell 7, existing deterministic January runtime and in-memory persistence harness.

## Global Constraints

- Start exactly from merge `12c25f7cde70a10fedcf3ecac6361a12ef63c0e8`.
- Keep Xoshiro256**, canonical JSON, deterministic artifacts and all January hashes unchanged.
- Do not change SQLite schema, WAL, `synchronous=FULL`, `BEGIN IMMEDIATE`, CAS, receipts or journal behavior.
- Do not add SQLx, pools, caches, telemetry SDKs, runtime LLMs or background network delivery.
- Performance samples are observational only and may never affect authoritative state or branching.
- Initial budgets are warning-only until a stable baseline exists.

---

## File Map

- Create `apps/desktop/src/performance/performance-recorder.ts`: typed timing names, monotonic clock port and immutable samples.
- Modify `apps/desktop/src/january/load-january-content.ts`: measure manifest, chunk and registry publication stages.
- Modify `apps/desktop/src/january/create-desktop-january-session.ts`: measure save bootstrap, runtime load and complete session bootstrap.
- Create `tests/performance-recorder.test.ts`: deterministic clock and failure-path tests.
- Create `tests/january-1990-performance-instrumentation.test.ts`: exact stage-order and no-authority regression tests.
- Create `tests/helpers/january-1990-performance-baseline.ts`: repeated playable workload runner and integer percentile summary.
- Create `tests/january-1990-performance-baseline.test.ts`: validate versioned summary and bounded scenario counts.
- Create `tests/materialize-january-performance-baseline.test.ts`: opt-in writer used by the repository command.
- Create `scripts/write-january-performance-baseline.mjs`: shell-free Vitest Node API entry point.
- Create `scripts/performance/capture-windows-profile.ps1`: collect reproducible OS/CPU/RAM/runtime metadata and invoke the baseline command.
- Modify `package.json`: add baseline scripts and include new files in formatting/lint inputs.
- Create `docs/performance/PERFORMANCE-BUDGETS.md`: warning-only budgets and promotion rules.
- Create `docs/performance/PROFILING-RUNBOOK.md`: cold/warm measurement procedure and artifact interpretation.
- Modify `docs/EXECUTION-STATUS.jsonc`: close January with merge SHA and mark OPT-00A active.

---

### Task 1: Typed observational timing port

**Files:**
- Create: `apps/desktop/src/performance/performance-recorder.ts`
- Test: `tests/performance-recorder.test.ts`

**Interfaces:**
- Produces `PerformanceTimingName`, `PerformanceSampleV1`, `PerformanceRecorder`, `createPerformanceRecorder`, and `NOOP_PERFORMANCE_RECORDER`.
- `measure(name, operation)` records elapsed integer microseconds for both fulfilled and rejected operations, then returns or rethrows the original result.

- [ ] **Step 1: Write failing recorder tests**

Test an injected monotonic sequence `[10, 10.125, 20, 20.5]`, immutable samples, fulfilled/rejected status and transparent error propagation.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm exec vitest run tests/performance-recorder.test.ts`

Expected: module-not-found failure for `performance-recorder`.

- [ ] **Step 3: Implement the minimal recorder**

Use an injected `nowMilliseconds` function, `Math.round((end - start) * 1000)`, `Object.freeze`, and no global mutable sample registry.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `pnpm exec vitest run tests/performance-recorder.test.ts`

Expected: all recorder tests pass.

### Task 2: Instrument the playable desktop bootstrap

**Files:**
- Modify: `apps/desktop/src/january/load-january-content.ts`
- Modify: `apps/desktop/src/january/create-desktop-january-session.ts`
- Test: `tests/january-1990-performance-instrumentation.test.ts`

**Interfaces:**
- `loadJanuaryContentRegistry(fetchContent, performance?)` accepts an optional recorder.
- `CreateDesktopJanuarySessionInput.performance?` supplies the recorder to the full composition path.
- Required names: `content.load_manifest`, `content.load_chunk`, `content.publish_registry`, `month.bootstrap_save`, `month.load`, `app.session_bootstrap`.

- [ ] **Step 1: Write failing stage-order tests**

Use the published content fixture, an in-memory persistence harness and an injected recorder. Assert exactly one manifest sample, two chunk samples, one registry sample, one save-bootstrap sample, one month-load sample and one complete-session sample.

- [ ] **Step 2: Confirm RED**

Run: `pnpm exec vitest run tests/january-1990-performance-instrumentation.test.ts`

Expected: optional recorder inputs and samples are absent.

- [ ] **Step 3: Add minimal instrumentation**

Wrap only existing operations. Do not change their concurrency, return values, error messages or deterministic inputs.

- [ ] **Step 4: Confirm GREEN and unchanged January result**

Run: `pnpm exec vitest run tests/january-1990-performance-instrumentation.test.ts tests/january-1990-desktop-bootstrap.test.ts`

Expected: all tests pass and the session still resumes the same access checkpoint.

### Task 3: Reproducible January baseline summary

**Files:**
- Create: `tests/helpers/january-1990-performance-baseline.ts`
- Create: `tests/january-1990-performance-baseline.test.ts`
- Create: `tests/materialize-january-performance-baseline.test.ts`
- Create: `scripts/write-january-performance-baseline.mjs`
- Modify: `package.json`

**Interfaces:**
- `runJanuary1990PerformanceBaseline({warmupRuns, measuredRuns})` returns `january-1990-performance-baseline-v1`.
- Summary stores integer microseconds with `count`, `min`, `p50`, `p95`, `p99`, and `max` per timing name.
- Default repository command uses 5 warmups and 30 measured runs.

- [ ] **Step 1: Write RED summary tests**

Assert scenario metadata, exact expected timing-name set, positive counts, sorted integer percentiles and no raw save/checkpoint payloads in the artifact.

- [ ] **Step 2: Confirm RED**

Run: `pnpm exec vitest run tests/january-1990-performance-baseline.test.ts`

Expected: baseline helper is missing.

- [ ] **Step 3: Implement baseline runner and shell-free writer**

Use published content, a fresh in-memory persistence harness per measured run and the official `vitest/node` API. Write to `artifacts/performance/january-1990-performance-baseline-v1.json`; do not commit machine-specific results as a golden.

- [ ] **Step 4: Confirm GREEN**

Run: `pnpm exec vitest run tests/january-1990-performance-baseline.test.ts`

Expected: deterministic shape checks pass.

- [ ] **Step 5: Run repository baseline command**

Run: `pnpm perf:january:baseline`

Expected: one versioned JSON artifact and successful exit.

### Task 4: Windows profile capture and operational documentation

**Files:**
- Create: `scripts/performance/capture-windows-profile.ps1`
- Create: `docs/performance/PERFORMANCE-BUDGETS.md`
- Create: `docs/performance/PROFILING-RUNBOOK.md`
- Modify: `docs/EXECUTION-STATUS.jsonc`

**Interfaces:**
- `pnpm perf:windows:profile` writes `artifacts/performance/windows-profile-v1.json` and runs the January baseline.
- Profile includes timestamp, Windows version/build, CPU model/logical processors, total RAM, Node, pnpm, Rust and repository commit; no usernames, paths, serial numbers or network identifiers.

- [ ] **Step 1: Implement redacted system-profile capture**

Use `Get-CimInstance` only for approved fields and `git rev-parse HEAD` for repository identity.

- [ ] **Step 2: Write budgets**

Document current warning-only targets: startup/FMP, interaction, queue wait, month context load, durable boundary, idle CPU, working-set growth and bundle growth. State that no optimization is authorized solely by one noisy sample.

- [ ] **Step 3: Write the profiling runbook**

Specify cold/warm runs, antivirus/background-load notes, three repeated batches, artifact retention, percentile interpretation and how to escalate an observed regression.

- [ ] **Step 4: Close January source-of-truth**

Record PR #32 merge `12c25f7cde70a10fedcf3ecac6361a12ef63c0e8` as complete and set the current phase to `performance-baseline-foundation`.

### Task 5: Verification and review closure

**Files:**
- All files above.

- [ ] **Step 1: Run targeted performance tests**

Run: `pnpm exec vitest run tests/performance-recorder.test.ts tests/january-1990-performance-instrumentation.test.ts tests/january-1990-performance-baseline.test.ts`

- [ ] **Step 2: Run repository checks**

Run: `pnpm docs:check && pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm boundaries:check && pnpm test`

- [ ] **Step 3: Confirm artifact reproducibility**

Run `pnpm perf:january:baseline` twice and verify both files have the same schema/scenario/timing-name set while allowing durations to differ.

- [ ] **Step 4: Review scope**

Confirm no SQL, migration, persistence command, checkpoint, RNG, compiled-content artifact or authoritative schema changed.

- [ ] **Step 5: Submit draft PR against `main`**

PR must reference #24, state measured versus unmeasured surfaces, and keep all budgets warning-only.
