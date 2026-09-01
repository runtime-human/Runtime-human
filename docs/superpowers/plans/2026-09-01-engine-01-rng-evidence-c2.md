---
title: "ENGINE-01 C2 RNG Evidence Implementation Plan"
type: plan
status: active
canon: false
depends_on: [issue-104, PR-108, PR-109, PR-111]
updated: 2026-09-01
---

# ENGINE-01 C2 — materialize RNG authority/shadow identity

## Goal

Make simulation, repro and CI evidence explicitly distinguish the current authoritative RNG semantics from the hierarchical shadow derivation introduced in #108/#109/#111, without changing authoritative January execution, checkpoint semantics, persistence, saves, balance or content.

## Compatibility rule

Do not add fields under existing `simulation-report-v1` or `game-repro-v1` schema versions. Introduce versioned V2 evidence contracts while keeping V1 parsers/read paths available.

## Contract

Use one shared immutable RNG evidence object:

- authority: `legacy-sequential-v1`;
- shadow: `hierarchical-v1` plus `RNG_DERIVATION_MANIFEST_V1`;
- January shadow report schema version;
- declared logical call budget by domain;
- committed January shadow golden fingerprint.

The object describes evidence only. It does not select execution semantics.

## TDD sequence

1. Add RED tests proving new simulation/repro outputs must expose the shared authority/shadow identity, old V1 parsers remain readable, mismatched identity is rejected for repro/compare, and CI materialization is byte-stable.
2. Add the shared evidence contract and parsers.
3. Add `simulation-report-v2` emitted by January simulation; preserve V1 parsing and comparison compatibility only when identities are unambiguous.
4. Add `game-repro-v2` emitted by repro creation/replay paths; preserve V1 replay as legacy evidence.
5. Add a deterministic `evidence:rng:january` writer and candidate/full CI artifact containing the V2 identity, call budget and golden hash.
6. Run `pnpm check:fast` and the RNG evidence writer/contract tests. Keep the PR stacked on #111 and draft.

## Non-goals

- no authoritative RNG cutover;
- no checkpoint/save-schema migration;
- no persistence changes;
- no change to `DETERMINISM_MANIFEST_V1`;
- no NPC runtime work;
- no generic RNG dependency-injection framework.
