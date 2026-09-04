# ENGINE-02 Stage F Runtime Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the verified linear January `ScenarioProgramV1` through the existing MonthRun protocol while preserving MonthRun ownership of checkpointing, suspend/resume, exactly-once, persistence, recovery, and RNG authority.

**Architecture:** Add a small `game-core` adapter that validates the separated program/capabilities/certificate artifacts and produces `MonthRunStep[]` from trusted typed bindings. Add January bindings that reuse existing domain step semantics, then expose a separate scenario-backed January runtime without changing the current default runtime.

**Tech Stack:** TypeScript 7, Vitest, pnpm, existing `@runtime-human/game-core`, `game-schema`, `game-devtools`, `game-application` boundaries.

**Spec:** `docs/superpowers/specs/2026-09-05-engine-02-stage-f-runtime-adapter-design.md`

## Global Constraints

- Base commit: `ccb5b9793c407686178f91fb0a6625ab6678dcfd`.
- No new persistence/recovery/RNG authority.
- No checkpoint schema v2.
- No default January cutover in this slice.
- Adapter accepts compiled/resolved/certified artifacts, never authoring JSON.
- Stage F runtime profile is entry PC 0, linear next-PC only, and rejects gate/branch.
- Every production change follows RED -> hosted feedback evidence -> GREEN -> fresh feedback -> authoritative V3.

---

### Task 1: Linear ScenarioProgram -> MonthRun adapter

**Files:**
- Create: `packages/game-core/src/scenario-runtime/linear-month-run-adapter.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/scenario-runtime-adapter.test.ts`

**Interfaces:**
- Produces `createLinearScenarioMonthRunStepsV1(input)` returning a readonly `MonthRunStep[]` or a structured fail-closed adapter error.
- Produces typed binding maps for decisions/providers/random-content plus one complete binding.
- Consumes `ScenarioProgramV1`, `ScenarioResolvedCapabilitiesV1`, `ScenarioCertificateV1`.

- [ ] Write RED tests proving implicit `start`, PC offset, linear decision/provider/random-content/complete dispatch, and rejection of gate/branch/non-linear successors/missing bindings/fingerprint mismatches.
- [ ] Run hosted `feedback` and record expected failures caused only by the missing adapter surface.
- [ ] Implement minimal adapter validation and dispatch.
- [ ] Run fresh hosted `feedback`; all existing and new adapter tests must pass.
- [ ] Commit adapter implementation.

### Task 2: Scenario execution compatibility fingerprint

**Files:**
- Create: `packages/game-core/src/scenario-runtime/execution-fingerprint.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/scenario-runtime-adapter.test.ts`

**Interfaces:**
- Produces `createScenarioExecutionRulesFingerprintV1({ domainRulesFingerprint, program, capabilities, certificate })`.
- The function validates program binding before hashing and returns one authoritative `Fingerprint` for `MonthRunCompatibilityV1.rulesFingerprint`.

- [ ] Add RED tests showing any program/capability/policy/certificate identity drift changes or rejects the composite identity.
- [ ] Implement the versioned fingerprint using the existing authoritative hash primitive.
- [ ] Verify adapter tests and MonthRun compatibility tests remain green.
- [ ] Commit compatibility fingerprint support.

### Task 3: January typed bindings without duplicated rules

**Files:**
- Modify: `packages/game-core/src/january-1990/january-month-steps.ts`
- Create: `packages/game-core/src/january-1990/january-scenario-runtime.ts`
- Modify: `packages/game-core/src/january-1990/index.ts`
- Test: `tests/january-1990-scenario-runtime.test.ts`

**Interfaces:**
- Produces a January scenario runtime artifact/binding builder from the existing content context + balance.
- Reuses the same access/work/defect/programming-outcome/complete functions used by the legacy January step table.
- Does not read `tools/scenario-shadow` from filesystem at runtime.

- [ ] Write RED tests for the eight-instruction January program and exact decision/provider/random-content identity mapping.
- [ ] Extract/reuse existing January domain step functions only as needed; do not duplicate domain logic.
- [ ] Materialize the verified January program/capability/certificate values through code-owned builders/constants that match Stage E fingerprints.
- [ ] Assert transition budget 8 and RNG bound 2 remain identical to Stage E evidence.
- [ ] Commit January binding support.

### Task 4: Controlled scenario-backed January application runtime

**Files:**
- Create: `packages/game-application/src/january-1990/create-january-scenario-runtime.ts`
- Modify: `packages/game-application/src/january-1990/index.ts`
- Test: `tests/january-1990-scenario-runtime.test.ts`
- Test: existing persisted MonthRun tests as required.

**Interfaces:**
- Produces `createJanuary1990ScenarioRuntime(input)` alongside, not instead of, `createJanuary1990Runtime`.
- Uses unchanged `createPersistedMonthRunOrchestrator`.
- Uses composite scenario execution fingerprint in its expected compatibility.

- [ ] RED: prove scenario runtime suspends on the same first decision and preserves persisted MonthRun boundaries.
- [ ] GREEN: wire adapter steps into the existing persisted orchestrator.
- [ ] Prove restart/load and duplicate resume continue to use existing exactly-once behavior.
- [ ] Prove program/rules/policy/certificate fingerprint mismatch blocks restore/resume via existing compatibility checks.
- [ ] Commit application runtime wiring.

### Task 5: Controlled January equivalence evidence

**Files:**
- Test: `tests/january-1990-scenario-runtime.test.ts`
- Create: `tools/scenario-shadow/january-1990/runtime-evidence.json`

**Interfaces:**
- Evidence records legacy vs scenario-backed decision sequence, terminal-result fingerprint, transition count, certified transition budget, actual RNG-call count/bound, and composite execution fingerprint.

- [ ] Run both legacy hierarchical and scenario-backed January runtimes over the deterministic selected corpus with the same answers/initial RNG state.
- [ ] Assert identical decision IDs and terminal result.
- [ ] Assert actual transitions <= 8 scenario instructions after implicit start accounting and RNG calls <= 2.
- [ ] Rebuild committed runtime evidence byte-for-byte in tests.
- [ ] Commit controlled equivalence evidence.

### Task 6: Verification and integration

**Files:**
- Update: ENGINE-02 issue #105 after merge only.

- [ ] Run fresh `feedback` on the exact final candidate head; require success.
- [ ] Apply `verify:v3`; require authoritative foundation V3 success including exact-parent evidence artifact.
- [ ] Create an exact-head non-draft integration PR if the evidence PR is draft-only.
- [ ] Require the integration PR's own fresh feedback + V3.
- [ ] Confirm zero unresolved review threads, unchanged base/head, and mergeability.
- [ ] SHA-guarded squash merge with durable title `feat(engine): integrate compiled scenario MonthRun adapter`.
- [ ] Confirm new `main` SHA.
- [ ] Update #105 with Stage F proof while keeping legacy January cutover status explicit; close ENGINE-02 only if all acceptance criteria are actually met.
