---
title: "PERF-02A Windows Evidence Collection Implementation Plan"
type: plan
status: draft
canon: true
updated: 2026-07-29
---

# PERF-02A Windows Evidence Collection Implementation Plan

## Goal

Produce source-backed, opt-in Windows evidence that joins the existing Rust desktop snapshot with browser User Timing and exact scenario metadata. The resulting report must preserve raw samples, keep incomparable clocks separate, compute nearest-rank percentiles and end PERF-02A with exactly one optimization recommendation.

## Dependency decision

### Add in the harness block

- `@wdio/tauri-service 1.2.0` as an isolated development dependency;
- WebdriverIO 9.30.x runner packages in a dedicated evidence workspace;
- optional `tauri-plugin-wdio` enabled only in an evidence build feature/configuration.

Tauri's current official guidance recommends WebdriverIO with `@wdio/tauri-service` for Windows, Linux and macOS and supports JavaScript execution plus Tauri IPC access. The evidence harness will use Windows only and remain opt-in.

### Do not use

- Playwright/CDP-only capture as the canonical path;
- production analytics or network upload;
- a renderer-to-Rust telemetry write channel;
- wall-clock subtraction between Rust and browser origins;
- arbitrary benchmark names or user payloads;
- automatic optimization based only on one sample.

## Phase E1 — Closed capture and report contract

Implement without new dependencies:

- `runtime-human-desktop-performance-capture-v1` input schema;
- `runtime-human-desktop-performance-evidence-v1` report schema;
- exact closed scenarios and classifications;
- exact Rust event and browser entry validation;
- raw sample preservation;
- nearest-rank p50/p95/p99;
- warning-only budget evaluation;
- deterministic output ordering;
- CLI accepting repeated `--input=` and one `--output=`;
- focused tests for malformed fields, unsafe numbers, unsupported names, percentile rules and mixed-host rejection.

## Phase E2 — Real Windows capture harness

Create isolated `tools/desktop-evidence` workspace:

- build the Tauri executable with an explicit `performance-evidence` feature;
- register `tauri-plugin-wdio` only for that feature;
- use `@wdio/tauri-service` on the self-hosted Windows host;
- execute JavaScript to read browser User Timing;
- invoke `desktop_get_performance_snapshot_v1` for the Rust snapshot;
- record external monotonic process-to-observation durations in the Node harness;
- write one capture file per run under `artifacts/performance/raw/`;
- never commit generated host captures.

## Clock policy

Rust `Instant` and browser `performance.now()` have different origins. The report must not subtract one from the other.

Reported timelines:

1. Rust process timeline: process entry → setup/worker/window milestones;
2. browser timeline: renderer bootstrap → shell commit → January ready → FMP;
3. browser end-to-end measures: existing content/session/month measures;
4. external harness timeline: process launch → observed shell/ready/FMP.

Only the external harness may produce process-to-FMP and process-to-January-ready values.

## Closed scenarios

- `startup-shell-fmp`;
- `startup-january-ready`;
- `load-persisted-context`;
- `begin-month-run`;
- `resume-month-run`;
- `final-commit`.

Each capture classifies:

- process: `cold-process` or `warm-process`;
- OS cache: `cold-os-cache` or `warm-os-cache`;
- database: `new-database` or `existing-clean-database`;
- sample role: `warmup` or `measurement`.

## Required output

For every scenario/classification group:

- sample count;
- raw samples;
- p50/p95/p99 for each available metric;
- minimum/maximum;
- dropped Rust event count;
- missing metric count;
- warning list.

The report contains no pass/fail performance gate. Correctness gates remain separate.

## Recommendation rule

After enough cold and warm measurement samples exist, compare the largest user-visible contributions:

- process/Tauri setup;
- persistence worker startup;
- renderer bootstrap/shell/FMP;
- January restoration;
- Tauri dispatch/queue/SQLite path;
- controlled shutdown/idle resources only if separately measured.

Select exactly one next optimization. If evidence is incomplete or contradictory, the recommendation is `collect-more-evidence`, not an architectural guess.
