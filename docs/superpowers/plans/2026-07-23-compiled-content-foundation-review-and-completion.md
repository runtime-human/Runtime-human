---
title: "Compiled content foundation review and completion plan"
type: plan
status: active
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-23
---

# Compiled Content Foundation Review and Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `CONTENT-01` as a deterministic, build-only JSONC content compiler with stable artifacts, bounded public contracts, precise diagnostics, semantic graph validation and repository-authoritative regression evidence.

**Architecture:** `@runtime-human/game-content` owns immutable runtime contracts only. `@runtime-human/game-content-compiler` owns JSONC parsing, Draft 2020-12 schema validation, semantic graph checks and canonical artifact generation. Ajv and `jsonc-parser` remain confined to the compiler package; renderer, application and runtime content packages never import them.

**Tech Stack:** Node.js 24, TypeScript 7.0.2, pnpm 11.11.0, Ajv 8.20.0, `jsonc-parser` 3.3.1, Vitest 4.1.10, existing authoritative canonical JSON and fingerprint functions.

## Global Constraints

- Active implementation profile is `MVP Casual`.
- This PR contains no January gameplay content, NPC simulation, UI, runtime LLM or persistence-schema changes.
- Content never executes arbitrary JavaScript or directly mutates authoritative game state.
- All identifiers and emitted artifact paths are stable, deterministic and path-traversal-safe.
- Authoritative arithmetic accepts safe integers only; `NaN`, `Infinity`, `-0`, sparse arrays and unsupported values remain forbidden by the existing canonical JSON boundary.
- Ordering uses explicit code-point comparison, never locale-dependent comparison.
- Every behavior change follows RED → GREEN → REFACTOR and is verified on the permanent read-only Windows workflow.
- Temporary write-enabled diagnostic workflows must not exist in the final diff.
- Merge requires unchanged-green-head verification and `expected_head_sha`.

---

## Review of the Current PR #21 Implementation

### Correct and retained

1. Runtime/compiler package separation is correct.
2. Ajv and `jsonc-parser` are build-only dependencies of `game-content-compiler`.
3. Input files, IDs, references, provenance, chunks and artifacts are explicitly sorted.
4. Chunk fingerprints exclude their own fingerprint field and use the existing authoritative hash boundary.
5. Manifest fingerprint is derived from compiler version, entry points and deterministic chunk descriptors.
6. JSONC diagnostics carry source path, line and column.
7. Duplicate IDs, missing references, chronology failures and unreachable entries are already represented by closed diagnostic codes.
8. Workspace project references and dependency-boundary checks include the compiler package.
9. The readonly `JSONPath` TypeScript 7 failure was fixed by passing a defensive copy to `jsonc-parser`.

### Required before merge

1. The last head was bot-authored and therefore received `action_required`; the fix still needs a fresh user-authored full gate.
2. A valid but empty source set currently compiles successfully; a valid set without an entry point produces only cascading unreachable diagnostics.
3. Reference chronology checks only the source start month, not the full source availability interval.
4. The 500+ line compiler module combines schema, parsing, diagnostics, graph validation and artifact generation.
5. There is no checked-in byte-golden fixture for `manifest.json` and chunk artifacts.
6. Critical paths lack direct tests: malformed JSONC, invalid/duplicate normalized paths, own chronology, no entry point, cycles, safe-integer rejection and source-order/comment independence.
7. `docs/EXECUTION-STATUS.jsonc` and the active execution ledger still describe the already-merged orchestration PR as current work.
8. The generated documentation catalog and manifest must be regenerated after this plan and status changes.

### Explicitly deferred

- Domain-specific situation/project/technology schemas.
- Actual `content-src` January 1990 authoring.
- Runtime lazy-loader integration with Vite.
- Mod/archive ingestion, zip limits and untrusted user pack sandboxing.
- Localization compilation.
- Semantic duplicate detection beyond stable ID/path/provenance equality.

---

### Task 1: Re-establish a Clean Verified Baseline

**Files:**
- Verify: `packages/game-content-compiler/src/index.ts`
- Verify absence: `.github/workflows/content-typecheck-diagnostic.yml`
- Verify absence: `.github/workflows/content-type-fix.yml`
- Verify: PR #21 changed-file list

**Interfaces:**
- Consumes: current PR head `fcb87fbe2961f606cf5964de05b0ed50caa0a991`.
- Produces: a user-authored head on which the permanent workflows can execute.

- [ ] **Step 1: Confirm the defensive-copy fix is present**

```ts
const node = findNodeAtLocation(document.root, [...path]) ?? document.root;
```

- [ ] **Step 2: Confirm temporary workflows are absent from the PR diff**

Expected changed paths are limited to compiler/runtime contracts, lockfile, tests, project references, boundary checker and documentation.

- [ ] **Step 3: Trigger the permanent workflows with this plan commit**

Expected initial outcome: documentation checks may report stale generated catalog files until Task 7; no temporary workflow may be reintroduced merely to bypass a real code failure.

- [ ] **Step 4: Record the first real failing permanent step**

Use the exact job step and diagnostic text as the next RED state. Do not infer later failures from an earlier stopped gate.

---

### Task 2: Split the Compiler by Responsibility Without Changing Behavior

**Files:**
- Create: `packages/game-content-compiler/src/content-source-schema.ts`
- Create: `packages/game-content-compiler/src/content-diagnostics.ts`
- Create: `packages/game-content-compiler/src/parse-content-sources.ts`
- Create: `packages/game-content-compiler/src/validate-content-graph.ts`
- Create: `packages/game-content-compiler/src/build-content-bundle.ts`
- Modify: `packages/game-content-compiler/src/index.ts`
- Test: `tests/content-compiler.test.ts`

**Interfaces:**
- Consumes: existing `ContentSourceFile`, `ContentDiagnostic`, `CompileContentResult` and compiled-content runtime contracts.
- Produces:

```ts
export const CONTENT_COMPILER_VERSION = "content-compiler-v1" as const;
export const CONTENT_SOURCE_SCHEMA_V1: Readonly<Record<string, unknown>>;
export function compileContentSources(
  files: readonly ContentSourceFile[],
): CompileContentResult;
```

- [ ] **Step 1: Add a public-surface regression test before moving code**

```ts
import {
  CONTENT_COMPILER_VERSION,
  CONTENT_SOURCE_SCHEMA_V1,
  compileContentSources,
} from "@runtime-human/game-content-compiler";

expect(CONTENT_COMPILER_VERSION).toBe("content-compiler-v1");
expect(CONTENT_SOURCE_SCHEMA_V1).toMatchObject({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
});
expect(typeof compileContentSources).toBe("function");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run tests/content-compiler.test.ts
```

Expected: failure because the schema/version exports do not yet exist.

- [ ] **Step 3: Extract schema and diagnostics with no semantic changes**

`content-source-schema.ts` owns the Draft 2020-12 schema and compiled Ajv validator. `content-diagnostics.ts` owns diagnostic codes, source coordinates, JSON Pointer conversion and stable diagnostic sorting.

- [ ] **Step 4: Extract parsing, graph validation and bundle building**

Each module receives explicit inputs and returns data/diagnostics; it must not import filesystem, React, Tauri or runtime state.

- [ ] **Step 5: Reduce `index.ts` to exports and orchestration**

```ts
export { CONTENT_COMPILER_VERSION, CONTENT_SOURCE_SCHEMA_V1 } from "./content-source-schema";
export type { ContentDiagnostic, ContentDiagnosticCode } from "./content-diagnostics";
export type { ContentSourceFile, CompileContentResult } from "./compile-content-sources";
export { compileContentSources } from "./compile-content-sources";
```

- [ ] **Step 6: Run focused tests, typecheck, lint and boundaries**

```bash
pnpm vitest run tests/content-compiler.test.ts
pnpm typecheck
pnpm lint
pnpm boundaries:check
```

Expected: all commands exit 0 before the refactor is considered behavior-preserving.

---

### Task 3: Enforce Entry-Point and Full Chronology Invariants

**Files:**
- Modify: `packages/game-content-compiler/src/content-diagnostics.ts`
- Modify: `packages/game-content-compiler/src/validate-content-graph.ts`
- Test: `tests/content-compiler.test.ts`

**Interfaces:**
- Produces new diagnostic code:

```ts
export type ContentDiagnosticCode =
  | "JSONC_PARSE"
  | "SCHEMA_INVALID"
  | "INVALID_PATH"
  | "DUPLICATE_PATH"
  | "DUPLICATE_ID"
  | "NO_ENTRY_POINT"
  | "MISSING_REFERENCE"
  | "CHRONOLOGY_INVALID"
  | "UNREACHABLE_CONTENT";
```

- [ ] **Step 1: Write the no-entry-point failing test**

```ts
it("rejects a valid source graph without an entry point", () => {
  const result = compileContentSources([
    source("content/technology.jsonc", technology()),
  ]);

  expect(result).toMatchObject({
    kind: "failure",
    diagnostics: [{ code: "NO_ENTRY_POINT" }],
  });
});
```

- [ ] **Step 2: Verify RED**

Expected current behavior: `UNREACHABLE_CONTENT`, not `NO_ENTRY_POINT`.

- [ ] **Step 3: Implement one graph-level diagnostic and suppress cascading unreachable diagnostics**

The diagnostic uses path `<content-set>`, line `1`, column `1`, and no content ID.

- [ ] **Step 4: Write the full-window chronology failing test**

```ts
it("rejects a reference whose availability does not cover the source window", () => {
  const result = compileContentSources([
    source(
      "content/technology.jsonc",
      technology({ availableTo: "1991-12" }),
    ),
    source(
      "content/storylet.jsonc",
      firstProgram({ availableTo: "1992-12" }),
    ),
  ]);

  expect(result).toMatchObject({
    kind: "failure",
    diagnostics: [{ code: "CHRONOLOGY_INVALID" }],
  });
});
```

- [ ] **Step 5: Implement interval containment**

A required reference is valid only when:

```ts
target.availableFrom <= source.availableFrom
&& (target.availableTo === undefined
  || (source.availableTo !== undefined
    && source.availableTo <= target.availableTo));
```

An open-ended source cannot require a finite target.

- [ ] **Step 6: Verify focused and complete test suites**

```bash
pnpm vitest run tests/content-compiler.test.ts
pnpm test
```

---

### Task 4: Add Adversarial Parser, Path and Canonical-Value Coverage

**Files:**
- Modify: `tests/content-compiler.test.ts`
- Modify only if RED proves a defect: compiler modules under `packages/game-content-compiler/src/`

**Interfaces:**
- No new production API unless a test proves the current closed diagnostic surface cannot represent the failure.

- [ ] **Step 1: Add malformed JSONC and empty-document tests**

Expected diagnostic: `JSONC_PARSE` with deterministic path/line/column.

- [ ] **Step 2: Add invalid and duplicate normalized path tests**

Cases:

```text
../escape.jsonc
/content.jsonc
C:/content.jsonc
content//entry.jsonc
content/./entry.jsonc
content/a.jsonc + content\\a.jsonc
```

Expected: `INVALID_PATH` or `DUPLICATE_PATH`, never an emitted artifact with attacker-controlled traversal.

- [ ] **Step 3: Add own chronology test**

`availableTo < availableFrom` must produce one `CHRONOLOGY_INVALID` at `availableTo`.

- [ ] **Step 4: Add cycle coverage**

A cycle reachable from an entry point is valid and terminates. A cycle with no entry point produces one `NO_ENTRY_POINT`, not an infinite traversal or one unreachable diagnostic per node.

- [ ] **Step 5: Add authoritative number tests**

Unsafe integers, decimals, `1e309` and unsupported schema values must fail validation or parsing; compiler execution must not throw for author-controlled JSONC.

- [ ] **Step 6: Add comment/path/order independence test**

Equivalent semantic content with different file order, comments and slash direction must emit byte-identical artifacts and fingerprints.

- [ ] **Step 7: Run RED/GREEN separately for every defect found**

Do not bundle unrelated parser fixes. Each production change receives the smallest test that fails for the observed reason.

---

### Task 5: Add Checked-In Byte-Golden Artifacts

**Files:**
- Create: `tests/fixtures/content-compiler/valid/1980s-technology.jsonc`
- Create: `tests/fixtures/content-compiler/valid/1990s-storylet.jsonc`
- Create: `tests/fixtures/content-compiler/valid/2000s-event.jsonc`
- Create: `tests/fixtures/content-compiler/expected/chunks/1980s/programming.json`
- Create: `tests/fixtures/content-compiler/expected/chunks/1990s/programming.json`
- Create: `tests/fixtures/content-compiler/expected/chunks/2000s/ecosystem.json`
- Create: `tests/fixtures/content-compiler/expected/manifest.json`
- Create: `tests/content-compiler-golden.test.ts`
- Modify: `tests/tsconfig.json` only if required by actual imports.

**Interfaces:**
- Consumes: `compileContentSources`.
- Produces: repository-visible byte contract for all v1 artifacts.

- [ ] **Step 1: Write the golden test before expected artifacts exist**

```ts
const result = compileContentSources(sourceFiles);
expect(result.kind).toBe("success");
if (result.kind !== "success") throw new Error("expected successful compilation");

for (const artifact of result.bundle.artifacts) {
  const expected = readFileSync(join(expectedRoot, artifact.path), "utf8");
  expect(artifact.json).toBe(expected);
}
```

- [ ] **Step 2: Verify RED because expected files are absent**

Run:

```bash
pnpm vitest run tests/content-compiler-golden.test.ts
```

- [ ] **Step 3: Generate expected files once from the reviewed compiler output**

Expected artifacts are committed as reviewable JSON, not opaque snapshots.

- [ ] **Step 4: Verify GREEN and then perturb input order**

The same golden files must pass when the source file array is reversed.

- [ ] **Step 5: Add fingerprint-domain assertions**

A payload change changes the owning chunk fingerprint and global fingerprint but leaves unrelated chunk bytes unchanged.

---

### Task 6: Verify Build-Only Dependency Isolation

**Files:**
- Verify: `packages/game-content-compiler/package.json`
- Verify: `packages/game-content/package.json`
- Verify: `scripts/check-boundaries.mjs`
- Verify: `pnpm-lock.yaml`
- Modify only if a verified boundary gap exists.

**Interfaces:**
- `game-content` may depend only on `game-schema` and `shared-kernel`.
- `game-content-compiler` may depend on `game-content`, `game-core`, `game-schema`, Ajv and `jsonc-parser`.
- Renderer/application/UI packages may not import `game-content-compiler`, Ajv or `jsonc-parser`.

- [ ] **Step 1: Run workspace dependency validation**

```bash
pnpm boundaries:check
```

- [ ] **Step 2: Inspect the renderer dependency graph**

```bash
pnpm --filter @runtime-human/desktop list ajv jsonc-parser --depth 20
```

Expected: neither package is reachable from the desktop package.

- [ ] **Step 3: Run renderer and Storybook builds**

```bash
pnpm --filter @runtime-human/desktop build
pnpm --filter @runtime-human/desktop storybook:build
```

Expected: no compiler dependency is bundled or required.

---

### Task 7: Synchronize Execution Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/EXECUTION-STATUS.jsonc`
- Modify: `docs/superpowers/plans/2026-07-22-runtime-human-execution-status.md`
- Regenerate: `docs/CATALOG.md`
- Regenerate: `docs/MANIFEST.jsonc`
- Keep: `docs/superpowers/plans/2026-07-23-compiled-content-foundation-review-and-completion.md`

**Interfaces:**
- Execution ledger records merged orchestration PR #20 at commit `1357124e85a5b38c41819ec0413183969c679d60`.
- Active work becomes `CONTENT-01`, PR #21, branch `agent/compiled-content-foundation`.

- [ ] **Step 1: Mark orchestration complete and content foundation active**

Use factual GitHub evidence; do not describe draft work as complete.

- [ ] **Step 2: Set merge eligibility false until the final unchanged head passes**

```json
{
  "currentPhase": "compiled-content-foundation",
  "currentConstraint": "final-head-must-remain-unchanged-and-green",
  "currentPullRequestMayMerge": false
}
```

- [ ] **Step 3: Regenerate documentation indexes with the repository script**

```bash
node scripts/build-toc.mjs
node scripts/build-toc.mjs --check
```

- [ ] **Step 4: Verify only expected documentation files changed**

Generated files must not be edited manually beyond the generator output.

---

### Task 8: Final Adversarial Review and Merge Gate

**Files:**
- Review every changed file in PR #21.
- No new feature files unless the review identifies a concrete correctness defect.

**Interfaces:**
- Produces a merge-ready PR only after evidence from the unchanged final head.

- [ ] **Step 1: Review public-contract stability**

Check schema versions, compiler version, artifact paths, chunk IDs, fingerprint domains, diagnostic codes and exact optional properties.

- [ ] **Step 2: Review deterministic behavior**

Check source ordering, object insertion order, reference ordering, provenance ordering, graph traversal, diagnostic ordering and line-ending behavior.

- [ ] **Step 3: Review failure containment**

Author-controlled malformed JSONC must return diagnostics rather than throw. Internal impossible states may throw only when schema validation has already established the invariant.

- [ ] **Step 4: Review scope**

Confirm no January content, runtime loader, NPC, UI, persistence or generic workflow framework entered the PR.

- [ ] **Step 5: Run the permanent full verification**

```bash
pnpm verify
```

Required green steps:

1. documentation check;
2. Oxfmt;
3. fast Oxlint;
4. TypeScript 7 build;
5. package boundaries;
6. full Vitest suite;
7. type-aware lint;
8. renderer build;
9. Storybook build;
10. Rust format;
11. Rust workspace check;
12. sequential Rust tests.

- [ ] **Step 6: Inspect automated review state**

Require Sonar Quality Gate pass, zero unresolved review threads and no unexpected workflow files in the diff.

- [ ] **Step 7: Update PR description with exact final head and evidence**

Do not claim line-by-line review that did not occur.

- [ ] **Step 8: Mark ready and squash merge with head protection**

Use `expected_head_sha` equal to the exact unchanged verified head.

---

## Completion Report Requirements

The PR completion report must include:

- changed files and public contracts;
- active profile `MVP Casual`;
- confirmation that visible gameplay complexity is unchanged;
- confirmation that authoritative save state and SQLite schema are unchanged;
- content ID/artifact compatibility implications;
- exact golden fixtures added;
- complete verification results;
- deferred typed domain schemas, January content, runtime loader and mod ingestion;
- recovery/compatibility impact: none outside compiled-content fingerprint/version compatibility.
