---
title: "Remote GitHub Control Plane Slice A"
type: plan
status: completed
canon: false
updated: 2026-08-31
---

# Remote GitHub Control Plane Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first remote-only development foundation: strict game version tooling, `studioctl capabilities/inspect`, and `gamectl capabilities`, all with machine-readable contracts and CI coverage.

**Architecture:** Keep `gamectl` game-semantic and Git-unaware. Add `studioctl` as a thin read-only facade over existing `.studio` zone/risk/context/finding logic. Treat `apps/desktop/src-tauri/tauri.conf.json > version` as the canonical game version and validate the root/desktop/Cargo mirrors mechanically.

**Tech Stack:** Node 24 ESM, TypeScript/tsx for `gamectl`, Node `.mjs` for Studio/version tooling, Vitest tooling-node project, existing `.studio` JSON contracts, Git CLI for exact SHA inspection.

**Spec:** `docs/superpowers/specs/2026-08-31-remote-github-control-plane-design.md`

## Global Constraints

- Normal development must work with ChatGPT + GitHub only; no local workstation or self-hosted runner is assumed.
- Game versions are only `0.0.N`, starting at `0.0.1`; a release bump is exactly `N -> N+1`.
- `tauri.conf.json > version` is canonical; root `package.json`, desktop `package.json`, Cargo package version, and Cargo lock package entry are mirrors.
- `pnpm verify` remains the sole V3 authority.
- `gamectl` remains read-only and has no Git/GitHub semantics.
- `studioctl inspect` is read-only and must not write `.studio/runtime`.
- New JSON contracts use stable schema IDs and deterministic ordering.
- Production behavior is implemented only after a failing test demonstrates the missing behavior.

---

### Task 1: Version contract and bump tool

**Files:**
- Create: `scripts/versioning.mjs`
- Create: `tests/versioning.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`

**Interfaces:**
- Produces `readVersionState(root)`, `checkVersionState(root)`, `nextGameVersion(version)`, `bumpGameVersion(root, explicitTarget?)` from `scripts/versioning.mjs`.
- CLI forms: `node scripts/versioning.mjs check` and `node scripts/versioning.mjs bump [0.0.N]`.
- `pnpm version:check` is read-only; `pnpm version:bump -- [target]` mutates mirrors only.

- [ ] **Step 1: Write failing tests** proving `0.0.1` is accepted, mirror drift is rejected, malformed versions are rejected, `nextGameVersion("0.0.9") === "0.0.10"`, an explicit skipped target is rejected, and bumping a fixture updates all mirrors including the Runtime Human Cargo.lock package entry.
- [ ] **Step 2: Run** `pnpm exec vitest run --project tooling-node tests/versioning.test.ts` and confirm failure because `scripts/versioning.mjs` is missing.
- [ ] **Step 3: Implement** strict parsers and mutation using only Node built-ins. Parse JSON normally; update only the top-level `version` fields for JSON files and exact `[package]` / matching `[[package]] name = "runtime-human-desktop"` version lines for Cargo files. Refuse ambiguous/missing package entries.
- [ ] **Step 4: Wire** `version:check` into `check:fast`; add the new test to `tooling-node`; include the new script in fmt/lint inputs.
- [ ] **Step 5: Run** focused tests plus `pnpm version:check` and expect PASS.
- [ ] **Step 6: Commit** `feat(tooling): enforce sequential game versions`.

### Task 2: `studioctl capabilities` and exact-diff inspection library

**Files:**
- Create: `scripts/studio/control-plane-lib.mjs`
- Create: `scripts/studioctl.mjs`
- Create: `tests/studioctl-cli.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.ts`

**Interfaces:**
- `STUDIO_CAPABILITIES_SCHEMA = "runtime-human-studio-capabilities-v1"`.
- `CHANGE_INSPECTION_SCHEMA = "runtime-human-change-inspection-v1"`.
- `buildStudioCapabilities()` returns command/contract/verification discovery without reading Git state.
- `inspectChange(root, { base, head })` resolves both refs to exact SHAs, computes `git diff --name-only -z <baseSha> <headSha>`, and reuses existing `.studio` helpers for zones/risk/skills/read budgets/findings/verification.
- CLI forms: `pnpm studioctl capabilities --json` and `pnpm studioctl inspect --base <ref> --head <ref> --json`.

- [ ] **Step 1: Write failing tests** for capability schema stability, exact resolved SHAs, deterministic sorted changed paths, tooling-zone classification, authority-impact flags, relevant findings projection, and proof that no `.studio/runtime` file is created.
- [ ] **Step 2: Run** `pnpm exec vitest run --project tooling-node tests/studioctl-cli.test.ts` and confirm the missing CLI/library failure.
- [ ] **Step 3: Implement** `control-plane-lib.mjs` by reusing `resolveZones`, `classifyRisk`, `selectSkills`, `buildReadLists`, `selectRelevantFindings`, `deriveVerification`, `shouldRecommendFullGate`, `OPEN_LEDGER`, and `readJsonl`; do not copy their algorithms.
- [ ] **Step 4: Implement** a strict CLI parser supporting only `capabilities` and `inspect` in Slice A; JSON mode emits exactly one stdout object and usage failures exit 2.
- [ ] **Step 5: Wire** `studioctl` into package scripts and tooling-node config; include files in fmt/lint.
- [ ] **Step 6: Run** focused tests and `pnpm studioctl capabilities --json`; expect PASS and stable schemas.
- [ ] **Step 7: Commit** `feat(studio): add remote inspection facade`.

### Task 3: `gamectl capabilities`

**Files:**
- Modify: `scripts/gamectl.ts`
- Modify: `tests/gamectl-cli.test.ts`

**Interfaces:**
- New command ID: `capabilities`.
- Result schema: `runtime-human-gamectl-capabilities-v1`.
- Existing transport envelope stays `runtime-human-gamectl-v1`.
- Capabilities report only commands that are actually implemented at this head; planned Slice B commands are absent.

- [ ] **Step 1: Write a failing test** invoking `runGamectlCli(["--json", "capabilities"], io)` and asserting transport schema, command ID, result schema, current command map, diagnostic contract, and absence of planned commands such as `catalog.inspect`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project tooling-node tests/gamectl-cli.test.ts` and confirm failure because `capabilities` is not routed.
- [ ] **Step 3: Implement** a constant capability projection and route/handler/human output without touching game state or repository content.
- [ ] **Step 4: Run** the focused test and existing gamectl tooling tests; expect PASS.
- [ ] **Step 5: Commit** `feat(gamectl): expose exact capabilities`.

### Task 4: Documentation, contract checks and stacked PR verification

**Files:**
- Modify: `docs/engineering/GAMECTL.md`
- Create: `docs/engineering/STUDIOCTL.md`
- Modify: `.studio/project.json`
- Modify: `scripts/studio/check-config.mjs`

**Interfaces:**
- `.studio/project.json.commands` exposes `studioCtl`, `versionCheck`, and retains existing authoritative gates.
- Studio config check mechanically requires the new package commands/files.

- [ ] **Step 1: Add contract tests/check-config assertions first** so missing `studioctl`/version commands fail Studio integrity checks.
- [ ] **Step 2: Update docs** with implemented-only command lists and explicit Slice B deferrals; document version authority and exact `0.0.N -> 0.0.(N+1)` rule.
- [ ] **Step 3: Run** `pnpm studio:check`, `pnpm docs:check`, `pnpm version:check`, focused tooling tests, then `pnpm check:fast`.
- [ ] **Step 4: Open a stacked PR** from the Slice A feature branch into `chore/public-governance-github-ci` so PR #82 remains independent. Record current-head GitHub-hosted CI runs as evidence.
- [ ] **Step 5: Run/observe V3** through the existing `foundation` workflow; do not claim completion until the exact head is green.
- [ ] **Step 6: Perform a fresh diff review** for duplicated authority, accidental Git semantics in `gamectl`, version mirror corruption, and any new personal/local path leakage.
