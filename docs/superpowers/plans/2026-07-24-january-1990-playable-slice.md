# January 1990 Playable Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first deterministic, suspendable, resumable and atomically committable January 1990 gameplay month using compiled-content v1.

**Architecture:** Author JSONC remains build-time input owned by `@runtime-human/game-content-compiler`. A repository command discovers configured sources, compiles them, and atomically publishes immutable manifest/chunk artifacts. Runtime code in `@runtime-human/game-content` validates and loads only compiled JSON, while existing game-core, application orchestration, Xoshiro256 and SQLite MonthRun contracts remain authoritative.

**Tech Stack:** TypeScript 7, Node.js 24, pnpm 11.11, Vitest 4, Oxfmt/Oxlint, React 19, Vite 8, Tauri 2, Rust 1.97, rusqlite/SQLite.

## Global Constraints

- Start from PR #21 merge commit `4355c0917ef7aa95f4a352bae70599dd38aba33f`.
- JSONC, Ajv and `jsonc-parser` remain build-time only.
- Runtime consumes versioned compiled manifest/chunk JSON only.
- Reuse existing Xoshiro256 forks and MonthRun transition protocol; no `Math.random()` or wall-clock decisions.
- Preserve SQLite schemas, revision/hash CAS, durable receipts and atomic MonthRun commit semantics unless an existing field is proven insufficient.
- Content is immutable data and cannot directly mutate progression, projects, money, equipment or relationships.
- MVP Casual scope: five skills, one technology family and Tier A technology/version band, one platform/toolchain/ecosystem context, two access routes, one project archetype, two work packages, one authored professional situation variant, three visible qualities, one issue branch and 4–6 events.
- No NPC memory/utility engine, city-wide simulation, runtime LLM, generic scripting, arbitrary mod ingestion or broad UI redesign.
- Every task follows RED → GREEN → REFACTOR and ends with independently reviewable evidence.

## Delivery Sequence

1. `CONTENT-02A` — production compile/check pipeline.
2. `CONTENT-02B` — minimal January registry and golden artifacts.
3. `CONTENT-02C` — verified runtime loader and registry.
4. `CONTENT-02D` — January projections, MonthRun and persistence compatibility.
5. `CONTENT-02E` — thin UI, restart/balance evidence and status update.

---

### Task 1: Deterministic content source discovery

**Files:**
- Create: `packages/game-content-compiler/src/load-content-source-files.ts`
- Modify: `packages/game-content-compiler/src/index.ts`
- Test: `tests/content-source-loader.test.ts`

**Interfaces:**

```ts
export type LoadContentSourceFilesOptions = Readonly<{
  repositoryRoot: string;
  sourceRoots: readonly string[];
}>;

export function loadContentSourceFiles(
  options: LoadContentSourceFilesOptions,
): Promise<readonly ContentSourceFile[]>;
```

Returned paths are POSIX-style and relative to `repositoryRoot`.

- [ ] **Step 1: Write a failing deterministic-order test**

```ts
it("loads configured JSONC roots in normalized code-point order", async () => {
  const files = await loadContentSourceFiles({
    repositoryRoot: fixtureRoot,
    sourceRoots: ["content/1990s", "content/sources"],
  });

  expect(files.map((file) => file.path)).toEqual([
    "content/1990s/a.jsonc",
    "content/1990s/nested/β.jsonc",
    "content/sources/z.jsonc",
  ]);
});
```

- [ ] **Step 2: Write failing path and symlink boundary tests**

```ts
it.each(["../outside", "/absolute", "C:/absolute"])(
  "rejects source root %s outside the repository",
  async (sourceRoot) => {
    await expect(
      loadContentSourceFiles({ repositoryRoot: fixtureRoot, sourceRoots: [sourceRoot] }),
    ).rejects.toThrow("Content source root must stay inside repository root");
  },
);
```

- [ ] **Step 3: Verify RED**

Run: `pnpm vitest run tests/content-source-loader.test.ts`

Expected: FAIL because `loadContentSourceFiles` is not exported.

- [ ] **Step 4: Implement iterative discovery**

Requirements:

- resolve `repositoryRoot` once;
- accept normalized relative source roots only;
- use `lstat` and reject symbolic links;
- recurse only into directories;
- include only regular `.jsonc` files;
- normalize separators to `/`;
- sort with existing `compareText`;
- reject duplicate normalized paths;
- read UTF-8 only after validation.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm vitest run tests/content-source-loader.test.ts
pnpm typecheck
pnpm lint:type-aware
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/game-content-compiler/src/load-content-source-files.ts \
  packages/game-content-compiler/src/index.ts tests/content-source-loader.test.ts
git commit -m "feat: add deterministic content source discovery"
```

---

### Task 2: Atomic compiled artifact publication

**Files:**
- Create: `packages/game-content-compiler/src/write-content-artifacts.ts`
- Modify: `packages/game-content-compiler/src/index.ts`
- Test: `tests/content-artifact-writer.test.ts`

**Interfaces:**

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

- [ ] Write failing exact-byte, stale-file and partial-failure tests.
- [ ] Validate each artifact path as normalized relative POSIX.
- [ ] Write under a sibling staging directory.
- [ ] Replace output only after all writes succeed.
- [ ] Report missing, changed and unexpected paths in `compareText` order.
- [ ] Run focused tests, typecheck and type-aware lint.
- [ ] Commit `feat: add atomic compiled content publication`.

---

### Task 3: Repository content build/check command

**Files:**
- Create: `content/content.config.json`
- Create: `scripts/build-game-content.mjs`
- Create: `packages/game-content-compiler/src/format-content-diagnostics.ts`
- Modify: `package.json`
- Modify: `.github/workflows/foundation.yml`
- Test: `tests/content-build-command.test.ts`

**Contracts:**

- `pnpm content:build` compiles and writes artifacts.
- `pnpm content:check` compiles and exits non-zero if generated output differs.
- Diagnostics are emitted as `path:line:column CODE message` in compiler order.

- [ ] Write failing CLI fixture tests.
- [ ] Parse only `sourceRoots` and `outputRoot` from config.
- [ ] Compile only through `compileContentSources`.
- [ ] Add permanent `content:check` before renderer build.
- [ ] Verify build/check idempotence and stale-artifact rejection.
- [ ] Commit `feat: add production content build command`.

---

### Task 4: Minimal January authored registry

**Files:**
- Create JSONC under `content/sources/technology`, `content/1990s/programming`, and `content/1990s/ecosystem`.
- Generate `apps/desktop/public/content/manifest.json`.
- Generate `apps/desktop/public/content/chunks/1990s/programming.json`.
- Generate `apps/desktop/public/content/chunks/1990s/ecosystem.json`.
- Test: `tests/january-content-golden.test.ts`

**Stable IDs:**

```text
core.skill.problem-decomposition
core.skill.program-reading
core.skill.program-writing
core.skill.debugging
core.skill.tool-use
core.tech-family.basic
core.technology.qbasic
core.tech-band.qbasic-dos-1990
core.platform.dos-pc
core.toolchain.qbasic-editor
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
- [ ] Separate source-backed QBasic/DOS chronology from fictional local diffusion.
- [ ] Create an entry-point chain reaching every definition.
- [ ] Add provenance to all historical and design definitions.
- [ ] Run `content:build` and commit exact generated bytes.
- [ ] Verify source order/comments/separators do not change output.
- [ ] Commit `feat: add January 1990 compiled content`.

---

### Task 5: Runtime compiled artifact parser

**Files:**
- Create: `packages/game-content/src/content-errors.ts`
- Create: `packages/game-content/src/parse-compiled-content.ts`
- Modify: `packages/game-content/src/index.ts`
- Test: `tests/compiled-content-parser.test.ts`

**Interfaces:**

```ts
export type ContentLoadError =
  | { code: "INVALID_JSON"; artifact: string }
  | { code: "UNSUPPORTED_MANIFEST"; artifact: string }
  | { code: "UNSUPPORTED_CHUNK"; artifact: string }
  | { code: "INVALID_SHAPE"; artifact: string; path: string }
  | { code: "DUPLICATE_ID"; artifact: string; contentId: string }
  | { code: "FINGERPRINT_MISMATCH"; artifact: string };

parseCompiledManifest(json: string): ContentParseResult<CompiledContentManifestV1>;
parseCompiledChunk(json: string): ContentParseResult<CompiledContentChunkV1>;
```

- [ ] Write failing valid/invalid/version/duplicate tests.
- [ ] Parse with native `JSON.parse` only.
- [ ] Validate closed v1 shapes iteratively with node/depth limits.
- [ ] Reject unknown keys and unsafe integers.
- [ ] Recompute canonical fingerprints using game-core primitives.
- [ ] Verify runtime has no Ajv/jsonc-parser dependency.
- [ ] Commit `feat: add compiled content runtime parser`.

---

### Task 6: Required chunk selector and immutable registry

**Files:**
- Create: `packages/game-content/src/select-required-chunks.ts`
- Create: `packages/game-content/src/content-registry.ts`
- Create: `packages/game-content/src/content-loader.ts`
- Modify: `packages/game-content/src/index.ts`
- Test: `tests/content-loader.test.ts`

**Interfaces:**

```ts
selectRequiredChunks(manifest, {
  era: "1990s",
  domains: ["ecosystem", "programming"],
});
createContentRegistry(manifest, chunks);
loadCompiledContent({ loadText, era, domains });
```

- [ ] Test that only required January chunks are requested.
- [ ] Test missing, extra, duplicate and wrong-fingerprint chunks.
- [ ] Publish registry only after complete validation.
- [ ] Expose immutable `get`, `require` and `listByKind` lookups.
- [ ] Commit `feat: add verified compiled content registry`.

---

### Task 7: January technology and provider projections

**Files:**
- Create: `packages/game-core/src/january-1990/january-content-context.ts`
- Create: `packages/game-core/src/january-1990/january-learning-provider.ts`
- Create: `packages/game-core/src/january-1990/january-project-provider.ts`
- Create: `packages/game-core/src/january-1990/january-event-provider.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/january-content-context.test.ts`

- [ ] Test global chronology, local availability and practical access as separate inputs.
- [ ] Project a closed context with reason codes.
- [ ] Map choices to typed provider proposals, never direct state mutation.
- [ ] Commit `feat: add January content projections`.

---

### Task 8: Deterministic January MonthRun plan

**Files:**
- Create: `packages/game-core/src/january-1990/january-month-plan.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/january-month-run.test.ts`

- [ ] Define fixed steps for access, learning, work, issue, response and result.
- [ ] Add fixed-seed boundary/checkpoint-hash golden tests.
- [ ] Use scoped RNG forks `month/content`, `month/narrative`, `month/outcome` with bounded call counts.
- [ ] Suspend only for meaningful choices.
- [ ] Commit `feat: add deterministic January MonthRun`.

---

### Task 9: Persisted content compatibility and restart path

**Files:**
- Create: `packages/game-application/src/january-1990/january-content-compatibility.ts`
- Create: `packages/game-application/src/january-1990/january-persisted-run.ts`
- Modify: `packages/game-application/src/index.ts`
- Test: `tests/january-persisted-run.test.ts`

- [ ] Reject content fingerprint/version mismatch before resume.
- [ ] Test process restart at every player boundary.
- [ ] Test duplicate requests return equivalent receipts.
- [ ] Test final commit advances save exactly once.
- [ ] Commit `feat: persist January MonthRun compatibility`.

---

### Task 10: Thin playable UI and evidence

**Files:**
- Create January view components in `packages/game-ui/src/january-1990/`.
- Add fixtures under `packages/game-ui-fixtures`.
- Wire desktop through application contracts only.
- Add balance/restart evidence tests.
- Update execution-status documentation.

- [ ] Render access, learning, work, issue, response and result states.
- [ ] Add keyboard, accessibility and Storybook tests.
- [ ] Capture bounded-seed event frequency, RNG calls, transitions and soft-lock evidence.
- [ ] Run `pnpm verify` and permanent docs/Sonar/review gates on one unchanged head.
- [ ] Record January complete and NPC slice next.
- [ ] Commit `feat: deliver January 1990 playable slice`.

## Definition of Done

- January sources compile deterministically into two verified chunks.
- Runtime loads only compiled artifacts and rejects corrupt/incompatible content.
- One complete month is playable, suspendable, restart-resumable and atomically committable.
- Fixed seeds produce fixed artifacts, boundaries and final hashes.
- Permanent docs/foundation/Sonar/review gates pass on one unchanged head.
- No excluded NPC, LLM, scripting, modding or persistence-redesign scope enters the slice.
