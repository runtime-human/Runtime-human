---
title: "Project & Technical Work Package Documentation Implementation Plan"
type: plan
status: completed
canon: true
depends_on: [ADR-013, ADR-014]
updated: 2026-07-18
---

# Project & Technical Work Package Documentation Implementation Plan

> **Status:** completed and merged through PR #5 on 2026-07-17; squash commit `5cd8e94d6424bb29376dbf3d78a1af7c213433af`.

**Goal:** Integrate SD-002 as the authoritative project/work-package architecture while preserving ADR-013 provider boundaries.

**Architecture:** Project Engine owns technical project truth. Product, Open Source, Company, Career and Progression consume typed inputs/outputs without duplicating ProjectState.

**Tech Stack:** Markdown system-design specifications, immutable TypeScript contracts, deterministic MonthRun rules, logical SQLite schema and JSONC definitions.

## Global Constraints

- Runtime Human remains programmer-first.
- Work Package is aggregated meaningful work, not ticket/daily task.
- No universal action points or percentage sliders.
- Project Engine does not change skills/grade directly.
- Product success is not technical evidence automatically.
- Authoritative arithmetic integer/fixed-point.
- Project outcome and progression evidence commit atomically.
- Minor defects/debt/employee tasks are aggregated.

## Task 1 — Decision and research trace

- [x] Add ADR-014 and SD-002.
- [x] Record Project ownership and extension boundaries.
- [x] Accept Work Package as minimum authoritative technical unit.
- [x] Accept multidimensional quality, uncertainty, debt pressure, latent/materialized defects and immutable releases.
- [x] Record sources/applicability and register indexes.

## Task 2 — Normative project specification

- [x] Add `PROJECT-WORK-PACKAGE-ENGINE.md`.
- [x] Rewrite Projects & Products as overview/extension map.
- [x] Define terminology and lifecycle state machines.
- [x] Define scope, requirements, packages, progress, forecasts and decisions.
- [x] Define quality, debt, defects, incidents, releases and maintenance.
- [x] Define contribution, ownership and delegation.
- [x] Define extension/Progression interfaces, contracts, functions, invariants and tests.

## Task 3 — Architecture, MonthRun and persistence

- [x] Add authoritative ProjectState and append-only project history.
- [x] Add project provider phases, deterministic IDs/RNG and atomic project/progression commit.
- [x] Define package checkpoints and compatibility fingerprints.
- [x] Preserve releases/debt/defects/scope semantics with snapshots/tombstones.
- [x] Define logical persistence, migration and recovery policy.

## Task 4 — Content and extension contracts

- [x] Add project archetype/package/quality/debt/defect/release/maintenance definitions.
- [x] Align Company, Open Source and Career with shared Project Engine.
- [x] Constrain Event content to typed Project operations.
- [x] Prevent narrative, revenue or community signals from manufacturing technical outcome/evidence.

## Task 5 — UI, balance and vertical slice

- [x] Add Project & Work Package UI read models and Storybook groups.
- [x] Add project farming, debt spiral, bug/release spam, parallelization and delegation metrics/tests.
- [x] Limit slice to one project, two packages, three quality dimensions and one release flow.
- [x] Stage Project Core before Product/OSS/Company portfolio complexity.
- [x] Update indexes and agent verification rules.

## Verification

- [x] Compare branch with `main`; `behind_by = 0` at review time.
- [x] Review for ticket-level micromanagement, single authoritative quality, direct skill changes, duplicated Product/Company/OSS state and nondeterministic hidden outcomes.
- [x] Verify ADR-014 Accepted and normative specification boundaries.
- [x] Open ready PR #5 and squash-merge into `main`.
