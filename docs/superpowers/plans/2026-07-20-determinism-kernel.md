---
title: "Determinism Kernel Implementation Plan"
type: plan
status: completed
canon: false
depends_on: [ADR-006, ADR-007]
updated: 2026-07-28
---

# Determinism Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a deterministic runtime foundation using audited or reference-backed libraries, with stable canonical hashing, versioned Xoshiro256** state, unbiased integer selection, scoped streams and shared TypeScript/Rust golden fixtures.

**Architecture:** Reuse `canonicalize@3.0.0` for RFC 8785 JSON canonicalization, `@noble/hashes@2.2.0` for synchronous SHA-256, `pure-rand@8.4.2` for integer/bigint distributions, and `rand_xoshiro@0.8.1` as the Rust reference implementation. Project code is limited to strict authoritative-value validation, a small TypeScript compatibility port of the reference Xoshiro256** transition/state contract, stable ID/fingerprint policy, scoped seed derivation and adapters. No gameplay state, persistence or MonthRun behavior is introduced.

**Tech Stack:** TypeScript 7, Vitest 4, canonicalize 3.0.0, @noble/hashes 2.2.0, pure-rand 8.4.2, Rust 1.97, rand_xoshiro 0.8.1, rand_core 0.10.0, serde 1.0.228.

## Global Constraints

- Work only on `agent/determinism-kernel`, never directly on `main`.
- Pin all new dependency versions exactly.
- Keep `game-core` pure: no system clock, locale, filesystem, SQLite, Tauri or UI reads.
- No `Math.random()`, floating-point authoritative APIs, `localeCompare`, implicit object/map iteration priority or raw `JSON.stringify` hashing.
- Preserve the accepted manifest identifiers: `xoshiro256ss-v1`, `sha256-v1`, `fixed-point-v1`, `gregorian-v1`, `stable-id-ascending-v1`, `phase-then-priority-then-stable-id-v1`, `canonical-json-v1`.
- Reject unsupported authoritative values before canonicalization.
- TypeScript and Rust must share committed golden vectors for seed expansion, generated words and serialized state.
- Do not implement persistence, MonthRun, gameplay formulas, content IDs or speculative extension fields.

---

### Task 1: Dependency and contract integration

**Files:**
- Modify: `package.json`
- Modify: `packages/game-core/package.json`
- Modify: `packages/game-schema/src/index.ts`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Create: `packages/game-schema/src/determinism.ts`
- Test: `tests/determinism-manifest.test.ts`

**Interfaces:**
- Produces: `DETERMINISM_MANIFEST_V1`, `DeterminismManifest`, `SerializedXoshiro256State`, `StableId`, `Fingerprint`.

- [ ] Write a failing test asserting the exact immutable manifest and serialized-state validation surface.
- [ ] Run the focused test and confirm failure because exports are absent.
- [ ] Pin the approved dependencies and add the minimal contracts.
- [ ] Run the focused test and all type checks.
- [ ] Commit the task.

### Task 2: Strict canonical payload validation and SHA-256

**Files:**
- Create: `packages/game-core/src/determinism/authoritative-json.ts`
- Create: `packages/game-core/src/determinism/hash.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/authoritative-json.test.ts`
- Test: `tests/deterministic-hash.test.ts`

**Interfaces:**
- Produces: `canonicalizeAuthoritative(value)`, `sha256Hex(bytesOrText)`, `stableId(namespace, value)`, `fingerprint(namespace, value)`.

- [ ] Write failing tests for key-order stability, array-order sensitivity and rejection of `undefined`, sparse arrays, cycles, non-finite/fractional/unsafe numbers, bigint, symbols, functions, class instances and accessors.
- [ ] Verify the tests fail because implementations are absent.
- [ ] Implement a bounded recursive validator, delegate canonicalization to `canonicalize`, and delegate hashing to `@noble/hashes`.
- [ ] Run focused tests, type-aware lint and package build.
- [ ] Commit the task.

### Task 3: TypeScript Xoshiro256** compatibility adapter

**Files:**
- Create: `packages/game-core/src/determinism/xoshiro256ss.ts`
- Create: `packages/game-core/src/determinism/random-source.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/xoshiro256ss.test.ts`

**Interfaces:**
- Produces: `Xoshiro256StarStar`, `RandomSource`, `fromSeed(seed)`, `fromState(state)`, `nextUint32()`, `nextInt(min,max)`, `weightedIndex(weights)`, `fork(scope)`, `exportState()`.

- [ ] Write failing tests from reference vectors plus state round-trip, duplicate restoration, unbiased range boundaries, all-zero and negative weights, and scope isolation.
- [ ] Verify expected failures.
- [ ] Port only the transition, SplitMix64 expansion, state serialization and jump constants from the reference implementation; adapt to `pure-rand` distributions.
- [ ] Run focused and property tests.
- [ ] Commit the task.

### Task 4: Rust parity and shared golden fixtures

**Files:**
- Create: `fixtures/determinism/xoshiro256ss-v1.json`
- Create: `apps/desktop/src-tauri/src/determinism.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Test: Rust unit tests in `apps/desktop/src-tauri/src/determinism.rs`
- Test: `tests/determinism-golden.test.ts`

**Interfaces:**
- Consumes: TypeScript serialized state contract.
- Produces: identical Rust/TypeScript vectors and state encoding.

- [ ] Add a fixture-driven TypeScript test that fails before the fixture/adapter is present.
- [ ] Add Rust tests reading the same fixture with `rand_xoshiro::Xoshiro256StarStar`.
- [ ] Implement exact little-endian 32-byte state conversion and validate non-zero state.
- [ ] Run TypeScript and Rust focused tests.
- [ ] Commit the task.

### Task 5: CI, documentation and review hardening

**Files:**
- Modify: `.github/workflows/foundation.yml`
- Modify: `docs/simulation/DETERMINISM.md`
- Modify: `docs/simulation/NUMERIC-POLICY.md`
- Modify: `docs/MANIFEST.jsonc`
- Modify: `docs/CATALOG.md`

**Interfaces:**
- Produces: clean-checkout determinism gate and documented dependency provenance.

- [ ] Add a PR-only determinism verification step covering TypeScript golden tests and Rust parity tests.
- [ ] Document exact dependencies, adaptation boundary, license provenance and manifest compatibility rule.
- [ ] Regenerate documentation metadata using the repository command.
- [ ] Run `pnpm check:fast`, `pnpm verify`, `cargo test --locked`, and production builds in GitHub Actions.
- [ ] Perform a full diff review for correctness, security, dependency boundaries, determinism and unnecessary abstraction; fix findings and rerun all gates.
