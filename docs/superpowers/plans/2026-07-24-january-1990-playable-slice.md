---
title: "January 1990 playable slice implementation plan"
type: plan
status: active
canon: false
depends_on: [ADR-001, ADR-004, ADR-005, ADR-007, ADR-019, ADR-020]
updated: 2026-07-24
---
# January 1990 Playable Slice Implementation Plan

> **For agentic workers:** execute this plan task-by-task. Each delivery must remain independently reviewable and follow RED → GREEN → REFACTOR.

**Goal:** Deliver the first deterministic, suspendable, resumable and atomically committable January 1990 gameplay month using compiled-content v1.

**Architecture:** Author JSONC is build-time input owned by `@runtime-human/game-content-compiler`. Repository tooling discovers configured sources, compiles them, and publishes immutable manifest/chunk artifacts. Runtime code in `@runtime-human/game-content` validates and loads only compiled JSON. Existing game-core, application orchestration, Xoshiro256 and SQLite MonthRun contracts remain authoritative.

**Tech Stack:** TypeScript 7, Node.js 24, pnpm 11.11, Vitest 4, Oxfmt/Oxlint, React 19, Vite 8, Tauri 2, Rust 1.97 and rusqlite/SQLite.

## Global Constraints

- Start from PR #21 merge commit `4355c0917ef7aa95f4a352bae70599dd38aba33f`.
- JSONC, Ajv and `jsonc-parser` remain build-time only.
- Runtime consumes versioned compiled manifest/chunk JSON only.
- Reuse existing Xoshiro256 forks and MonthRun transition protocol; no `Math.random()` or wall-clock decisions.
- Preserve SQLite schemas, revision/hash CAS, durable receipts and atomic MonthRun commit semantics unless an existing field is proven insufficient.
- Content is immutable data and cannot directly mutate progression, projects, money, equipment or relationships.
- MVP Casual scope: five skills, one technology family and Tier A technology/version band, one platform/toolchain/ecosystem context, two access routes, one project archetype, two work packages, one authored professional situation variant, three visible qualities, one issue branch and 4–6 events.
- No NPC memory/utility engine, city-wide simulation, runtime LLM, generic scripting, arbitrary mod ingestion or broad UI redesign.
- Performance issue #24 may contribute measurement infrastructure and bounded OPT-00–03 work, but must not delay the playable January path or redesign persistence.

## Delivery Sequence

1. `CONTENT-02A` — deterministic source discovery, transactional publication and repository build/check API.
2. `CONTENT-02B` — minimal January registry, production CLI/config, permanent `content:check` and golden artifacts.
3. `CONTENT-02C` — verified runtime parser, chunk selection and immutable registry.
4. `CONTENT-02D` — January projections, deterministic MonthRun and persisted compatibility.
5. `CONTENT-02E` — thin UI, restart/balance evidence and source-of-truth closure.

## Current Status

- PR #21 is merged at `4355c0917ef7aa95f4a352bae70599dd38aba33f`.
- PR #23 implements `CONTENT-02A` and remains draft until one unchanged head passes docs, foundation, Sonar and review gates.
- The temporary write-enabled normalization workflow and incomplete CLI/`tsx` integration were removed from PR #23.
- The January technology baseline is **GW-BASIC**, not QBasic. QBasic belongs to the DOS 5.0/1991 timeline.

---

## CONTENT-02A — Close PR #23

### Task 1: Deterministic content source discovery

**Files:**
- `packages/game-content-compiler/src/load-content-source-files.ts`
- `packages/game-content-compiler/src/index.ts`
- `tests/content-source-loader.test.ts`

**Contract:**

```ts
export type LoadContentSourceFilesOptions = Readonly<{
  repositoryRoot: string;
  sourceRoots: readonly string[];
}>;

export function loadContentSourceFiles(
  options: LoadContentSourceFilesOptions,
): Promise<readonly ContentSourceFile[]>;
```

- [x] Accept normalized repository-relative roots only.
- [x] Traverse iteratively and include regular `.jsonc` files only.
- [x] Reject symlinks and Windows junctions.
- [x] Return repository-relative POSIX paths in `compareText` order.
- [x] Reject duplicate normalized source paths.
- [x] Cover ordering, containment, duplicate-root and link boundaries with focused tests.

### Task 2: Transactional compiled artifact publication

**Files:**
- `packages/game-content-compiler/src/write-content-artifacts.ts`
- `packages/game-content-compiler/src/index.ts`
- `tests/content-artifact-writer.test.ts`

**Contracts:**

```ts
writeContentArtifacts(options: {
  outputRoot: string;
  artifacts: readonly CompiledContentArtifactV1[];
}): Promise<void>;

checkContentArtifacts(options: {
  outputRoot: string;
  artifacts: readonly CompiledContentArtifactV1[];
}): Promise<Readonly<{ current: boolean; differences: readonly string[] }>>;
```

- [x] Validate all artifact paths before touching output.
- [x] Reject duplicate paths and file/parent conflicts.
- [x] Write into a sibling staging directory.
- [x] Swap existing output through a backup directory only after all writes succeed.
- [x] Restore the previous output when publication fails.
- [x] Remove stale artifacts through full directory replacement.
- [x] Report `missing`, `changed` and `unexpected` paths in deterministic order.

### Task 3: Repository build/check application API

**Files:**
- `packages/game-content-compiler/src/content-build-config.ts`
- `packages/game-content-compiler/src/format-content-diagnostics.ts`
- `packages/game-content-compiler/src/run-content-build.ts`
- `packages/game-content-compiler/src/index.ts`
- `tests/content-build-project.test.ts`

**Contracts:**

```ts
parseContentBuildConfig(value: unknown): ContentBuildConfig;
formatContentDiagnostics(diagnostics): readonly string[];
runContentBuild(options): Promise<ContentBuildResult>;
```

- [x] Parse a closed config containing only `sourceRoots` and `outputRoot`.
- [x] Compile only through the public `compileContentSources` facade.
- [x] Return compiler diagnostics without publishing partial output.
- [x] Format diagnostics as `path:line:column CODE message` in compiler order.
- [x] Verify write → current and changed-source → outdated/no-mutation behavior.
- [x] Keep this API independent of a new runtime dependency or executable runner.

### Task 4: PR #23 closure gate

- [x] Remove all temporary diagnostic/normalization workflows from the diff.
- [x] Remove incomplete `tsx`/CLI wiring and restore frozen-lockfile consistency.
- [ ] Run `pnpm install --frozen-lockfile` on the exact head.
- [ ] Run focused source-loader, writer and build-project tests.
- [ ] Run permanent docs, formatting, lint, TypeScript, boundaries, full Vitest, renderer, Storybook and Rust gates.
- [ ] Confirm Sonar Security Rating A and no unresolved security hotspots.
- [ ] Confirm zero unresolved review threads.
- [ ] Update PR #23 body with exact final head and evidence.
- [ ] Mark PR ready only after all unchanged-head gates pass.
- [ ] Squash-merge with `expected_head_sha` equal to the verified head.

---

## CONTENT-02B — January Registry and Production Build Command

### Task 5: Define the exact January content registry

**Authoring roots:**

```text
content/
├── sources/technology/
├── 1990s/programming/
├── 1990s/ecosystem/
└── localization/ru/
```

**Stable IDs:**

```text
core.skill.problem-decomposition
core.skill.program-reading
core.skill.program-writing
core.skill.debugging
core.skill.tool-use
core.tech-family.basic
core.technology.gw-basic
core.tech-band.gw-basic-dos-1990
core.platform.dos-pc
core.toolchain.gw-basic-interpreter
core.ecosystem-profile.offline-manuals
core.local-tech-availability.shared-school-pc
core.local-tech-availability.home-pc
core.activity.first-listing
core.activity.modify-listing
core.project-archetype.personal-utility
core.work-package.input-output
core.work-package.validation-fix
core.situation-kernel.first-bug
core.event.access-window
core.event.manual-found
core.event.syntax-error
core.event.logic-error
core.event.program-runs
```

- [ ] Add a failing golden test expecting exactly two January chunks.
- [ ] Separate source-backed GW-BASIC/DOS chronology from fictional local diffusion.
- [ ] Cite provenance for every historically grounded definition.
- [ ] Keep localization/display strings outside semantic identifiers.
- [ ] Create an entry-point chain reaching every definition.
- [ ] Avoid fields not consumed by the January runtime path.

### Task 6: Production CLI, default config and permanent CI

**Files:**
- `content/content.config.json`
- repository-owned executable build/check entry point
- `package.json`
- `.github/workflows/foundation.yml`
- generated `apps/desktop/public/content/**`

- [ ] Add the executable runner only after the real config and source tree exist.
- [ ] Keep all config paths repository-relative and validated before filesystem access.
- [ ] Add `content:build` and `content:check` package scripts with a frozen lockfile.
- [ ] Ensure `content:check` never mutates the worktree.
- [ ] Run permanent `content:check` before renderer build.
- [ ] Generate and commit exact manifest/programming/ecosystem bytes.
- [ ] Verify source order, comments and path separators do not change output.
- [ ] Reject stale or unexpected generated files.
- [ ] Pass Sonar Security Rating A without suppressing path or workflow security rules.

**Output:**

```text
apps/desktop/public/content/
├── manifest.json
└── chunks/1990s/
    ├── programming.json
    └── ecosystem.json
```

---

## CONTENT-02C — Verified Runtime Loader

### Task 7: Runtime compiled artifact parser

**Files:**
- `packages/game-content/src/content-errors.ts`
- `packages/game-content/src/parse-compiled-content.ts`
- `packages/game-content/src/index.ts`
- `tests/compiled-content-parser.test.ts`

- [ ] Parse with native `JSON.parse` only.
- [ ] Validate closed v1 manifest/chunk shapes without Ajv or `jsonc-parser`.
- [ ] Enforce bounded node/depth limits and safe numeric values.
- [ ] Reject unknown keys, duplicate IDs and incompatible schema/compiler versions.
- [ ] Recompute and verify chunk/content fingerprints using game-core primitives.
- [ ] Return closed typed errors for invalid JSON, invalid shape and fingerprint mismatch.

### Task 8: Required chunk selector and immutable registry

**Files:**
- `packages/game-content/src/select-required-chunks.ts`
- `packages/game-content/src/content-registry.ts`
- `packages/game-content/src/content-loader.ts`
- `tests/content-loader.test.ts`

- [ ] Request only `1990s/programming` and `1990s/ecosystem` for January.
- [ ] Reject missing, extra, duplicate and wrong-fingerprint chunks.
- [ ] Publish a registry only after complete validation.
- [ ] Expose immutable `get`, `require` and `listByKind` lookups.
- [ ] Keep author source paths/comments out of runtime state.

---

## CONTENT-02D — January Domain and MonthRun

### Task 9: January provider-owned projections

**Files:**
- `packages/game-core/src/january-1990/january-content-context.ts`
- `packages/game-core/src/january-1990/january-learning-provider.ts`
- `packages/game-core/src/january-1990/january-project-provider.ts`
- `packages/game-core/src/january-1990/january-event-provider.ts`

- [ ] Keep global chronology, fictional local availability and practical access as separate inputs.
- [ ] Materialize exactly one professional situation variant at build time.
- [ ] Map choices to typed proposals, never direct state mutation.
- [ ] Preserve Progression, Project, Learning and Event ownership boundaries.
- [ ] Expose stable reason codes for UI explanations.

### Task 10: Deterministic January MonthRun plan

- [ ] Define fixed access, learning, work, issue, response and result steps.
- [ ] Use scoped RNG forks `month/content`, `month/narrative` and `month/outcome`.
- [ ] Document and test bounded RNG call counts per step.
- [ ] Suspend only on meaningful player decisions.
- [ ] Add fixed-seed boundary/checkpoint-hash golden tests.
- [ ] Reject object-order, wall-clock and runtime template-expansion dependencies.

### Task 11: Persisted content compatibility and restart path

- [ ] Include content schema/compiler/fingerprint in run compatibility context.
- [ ] Reject content mismatch before resume.
- [ ] Test process restart at every player boundary.
- [ ] Test duplicate requests return equivalent durable receipts.
- [ ] Preserve revision, payload SHA and checkpoint-hash CAS.
- [ ] Verify final commit advances the save exactly once.

---

## CONTENT-02E — Thin Playable UI and Evidence

### Task 12: Programmer-first interaction

Required flow:

1. obtain or negotiate computer/toolchain access;
2. choose a learning/practice approach;
3. complete a small GW-BASIC work package;
4. encounter one defect or constraint;
5. choose a response with visible trade-offs;
6. receive a compact outcome explanation;
7. persist, resume and commit the month.

- [ ] Keep UI as thin adapters over application/core state.
- [ ] Add keyboard, accessibility and Storybook coverage.
- [ ] Avoid navigation or design-system redesign.

### Task 13: Verification and source-of-truth closure

- [ ] Capture bounded-seed event/choice frequency.
- [ ] Capture RNG calls by scope and boundary/transition counts.
- [ ] Detect soft locks and measure programmer-action share.
- [ ] Run restart tests for every decision boundary.
- [ ] Run `pnpm verify` plus permanent docs/Sonar/review gates on one unchanged head.
- [ ] Record January as complete and the bounded guardian/mentor/peer NPC slice as next.

## Definition of Done

- January sources compile deterministically into two verified chunks.
- Runtime loads only compiled artifacts and rejects corrupt/incompatible content.
- One complete month is playable, suspendable, restart-resumable and atomically committable.
- Fixed seeds produce fixed artifacts, boundaries and final hashes.
- Permanent docs/foundation/Sonar/review gates pass on one unchanged head.
- No excluded NPC, LLM, scripting, modding or persistence-redesign scope enters the slice.
