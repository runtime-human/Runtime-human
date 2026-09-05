---
title: "ENGINE-02C Desktop Scenario Delivery Implementation Plan"
type: plan
status: active
canon: true
updated: 2026-09-05
---

# ENGINE-02C Desktop Scenario Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the certified January scenario artifact as a deterministic desktop asset and prove an explicit opt-in desktop scenario runtime path without changing default authority.

**Architecture:** Repository-side Node tooling uses the existing scenario compiler/resolver/certifier to materialize one canonical `scenario-artifact-v1`. Desktop transport fetches/parses that static artifact and passes it to the existing January runtime validator; application execution stays inside `createJanuary1990ScenarioRuntime` and the existing persisted MonthRun orchestrator.

**Tech Stack:** TypeScript 7, Node 24, Vitest 4, Vite/Tauri desktop, existing `game-devtools`, `game-core`, `game-schema`, `game-application`.

**Spec:** `docs/superpowers/specs/2026-09-05-engine-02c-desktop-scenario-delivery-design.md`

## Global Constraints

- Default desktop authority remains `legacy` in Stage A.
- Browser code never compiles scenario authoring JSON.
- Desktop runtime must not depend on `@runtime-human/game-devtools`.
- No new persistence/recovery/checkpoint protocol.
- Generated artifact must rebuild byte-for-byte and be checked by `check:fast`.
- Invalid scenario transport must fail before MonthRun mutation.

---

### Task 1: Deterministic production artifact builder

**Files:**
- Create: `scripts/build-january-scenario-artifact.ts`
- Create: `tests/january-1990-scenario-artifact-build.test.ts`
- Modify: `package.json`
- Create/generated: `apps/desktop/public/scenarios/january-1990.json`

**Interfaces:**
- Consumes committed `tools/scenario-shadow/january-1990/{source,registry,policy}.json` and existing compiler/resolver/certifier primitives.
- Produces `buildJanuaryScenarioArtifact()` and CLI modes `write` / `--check`, with canonical JSON plus trailing newline.

- [ ] **Step 1:** Add a failing tooling test proving the production artifact file exists, parses as `scenario-artifact-v1`, and exactly matches a freshly built artifact.
- [ ] **Step 2:** Run fast feedback and confirm RED is only missing builder/artifact contract.
- [ ] **Step 3:** Implement the builder using existing compiler/resolver/certifier/fingerprint primitives; no duplicate scenario logic.
- [ ] **Step 4:** Add `scenario:build` and `scenario:check`, include `scenario:check` in `check:fast`, and materialize the generated artifact.
- [ ] **Step 5:** Re-run focused/tooling tests and confirm byte-stable GREEN.

### Task 2: Runtime-safe desktop artifact loader

**Files:**
- Create: `apps/desktop/src/january/load-january-scenario-artifact.ts`
- Create: `tests/january-1990-desktop-scenario-artifact.test.ts`

**Interfaces:**
- Produces `JanuaryScenarioArtifactFetchPort` and `loadJanuaryScenarioArtifact(fetchPort): Promise<ScenarioArtifactV1>`.
- Loader parses transport JSON and invokes `assertJanuary1990ScenarioRuntimeArtifactV1` before returning it.

- [ ] **Step 1:** Add RED tests for valid published artifact, HTTP failure, malformed JSON, wrong schema/fingerprint.
- [ ] **Step 2:** Implement the minimal fetch/parse/validator boundary.
- [ ] **Step 3:** Run focused tests and prove invalid input rejects before runtime construction.

### Task 3: Explicit opt-in desktop scenario session

**Files:**
- Modify: `apps/desktop/src/january/create-desktop-january-session.ts`
- Modify: `tests/january-1990-desktop-bootstrap.test.ts`

**Interfaces:**
- Adds `DesktopJanuaryRuntimeMode = "legacy" | "scenario"`.
- Adds optional `runtimeMode` and `fetchScenarioArtifact` inputs; default remains `"legacy"`.

- [ ] **Step 1:** Add RED bootstrap tests proving default legacy compatibility and explicit scenario mode compatibility.
- [ ] **Step 2:** Add RED proving malformed scenario artifact fails before any begin/boundary/commit mutation.
- [ ] **Step 3:** Implement mode selection. Scenario mode loads artifact and calls `createJanuary1990ScenarioRuntime`; legacy mode retains current path unchanged.
- [ ] **Step 4:** Run desktop/application tests and verify existing session lifecycle still passes.

### Task 4: Integration verification and PR closure

**Files:**
- Modify only documentation/PR metadata if verification requires factual status updates.

- [ ] **Step 1:** Run `pnpm check:fast` through GitHub feedback on exact candidate head.
- [ ] **Step 2:** Run canonical V3 via existing `verify:v3` flow on the same unchanged head.
- [ ] **Step 3:** Confirm exact-parent/evidence materialization succeeds and review threads are empty.
- [ ] **Step 4:** Mark Stage A ready for review; do not change default authority in this PR.

Refs #158.
