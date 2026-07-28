---
title: "DOCS-01 Source-of-Truth Governance Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-07-28
---

# DOCS-01 Source-of-Truth Governance Implementation Plan

## Goal

Make the documentation governance layer closed, deterministic and useful for current execution without turning documentation into a workflow engine.

## Starting point

The repository already has:

- deterministic front-matter discovery;
- generated `MANIFEST.jsonc` and `CATALOG.md`;
- a curated `INDEX.md`;
- read-only documentation verification;
- a machine-readable `EXECUTION-STATUS.jsonc` ledger.

The missing controls are status validation, supersession hygiene and a first-level route from the curated index to current UI/PERF work and evidence.

## Task 1 — RED metadata contracts

Add tests that require:

- the exact closed status set;
- rejection of unknown values;
- `completed | superseded` for `docs/superpowers/plans/**`;
- reviewed status values for numbered ADRs;
- `superseded_by` only on superseded documents;
- an existing non-self supersession target.

## Task 2 — Pure validator

Add one dependency-free module owned by documentation tooling:

```text
scripts/docs-metadata.mjs
```

It validates metadata values and replacement links only. It must not schedule tasks, evaluate delivery dependencies or mutate documents.

## Task 3 — Generator integration

Update `scripts/build-toc.mjs` to:

- reuse the pure validator;
- retain existing type/canon/date/ADR dependency checks;
- publish `supersededBy` only when present;
- validate supersession targets after all entries are known;
- preserve deterministic output and read-only `--check` behavior.

## Task 4 — Curated navigation

Update `docs/INDEX.md` so the first working section exposes:

1. `EXECUTION-STATUS.jsonc`;
2. the current DOCS slice;
3. the remaining UI roadmap;
4. PERF master/product-facing/concrete next tracks;
5. budgets, profiling runbook and committed evidence.

Generated artifacts remain exhaustive indexes, not the source-precedence guide.

## Task 5 — Metadata convention

Update `docs/STYLE.md` with:

- the closed status vocabulary;
- numbered ADR policy;
- completed/superseded superpowers plan policy;
- repository-relative `superseded_by` syntax;
- the explicit statement that validation does not create a workflow engine.

## Task 6 — Post-merge UI closure

Synchronize `docs/EXECUTION-STATUS.jsonc` with merged PR #48:

- mark `career-overview-projection` complete;
- remove active branch metadata;
- record merge commit `0fd57232f16a7a903b11dcc56f83559ec2f8e5bb`;
- move the current phase to documentation governance;
- set the next delivery constraint to DOCS-01, followed by PERF-02A.

## Task 7 — Derived artifacts and verification

- regenerate `MANIFEST.jsonc` and `CATALOG.md`;
- apply canonical formatting;
- prove a second read-only generation has no diff;
- keep permanent workflows read-only in the final tree;
- pass docs and full foundation gates on one unchanged head;
- close issue #50 only after merge.

## Closure evidence

The migration classifies completed implementation plans, accepted design specifications and explicitly superseded execution documents without deleting historical material or weakening the closed status policy.

## Explicit exclusions

- runtime, gameplay, persistence or content changes;
- performance instrumentation or optimization;
- generic task graph or plan executor;
- automatic promotion of research into canon;
- deletion of historical plans;
- mass metadata rewrite without a validation reason.
