---
title: "Repository Foundation Implementation Plan"
type: plan
status: draft
canon: true
depends_on: [ADR-008, ADR-011, ADR-012, ADR-015, ADR-020]
updated: 2026-07-19
---

# Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать воспроизводимый TypeScript/React/Storybook/Tauri monorepo scaffold без преждевременной игровой логики.

**Architecture:** pnpm workspace содержит узкие TypeScript packages с project references и проверяемым dependency allow-list. Desktop является composition root, UI остаётся pure, а Tauri shell не предоставляет privileged commands. GitHub Actions выступает authoritative clean-build environment.

**Tech Stack:** Node 24, pnpm 11.11.0, TypeScript 7.0.2, React 19.2.7, Vite 8.1.5, Storybook 10.5.0, Oxlint 1.74.0, Oxfmt 0.59.0, Vitest 4.1.10, Tauri 2.11.x, Rust 1.97.0.

## Global Constraints

- Все версии Foundation toolchain закрепляются exact.
- Workspace dependencies используют `workspace:*`.
- TypeScript 7 является единственным production typechecker.
- `game-ui` не зависит от `game-core`.
- Desktop не содержит gameplay formulas и не импортирует Tauri API напрямую.
- Не добавлять SQLite, save, MonthRun, TypeBox, Tailwind, Router, Zustand, Nx или Turborepo.
- CI и generated-file checks не исправляют дерево автоматически после bootstrap.
- `docs/INDEX.md` остаётся ручным каноническим индексом; `docs/CATALOG.md` остаётся generated.

---

## File Map

### Root tooling

- `package.json` — единые exact dependencies и команды.
- `pnpm-workspace.yaml` — `apps/*`, `packages/*`.
- `tsconfig.base.json` — strict shared compiler policy.
- `tsconfig.json` — project references.
- `.oxlintrc.json`, `.oxfmtrc.json` — lint/format policy.
- `vitest.config.ts`, `tests/setup.ts` — test environment.
- `scripts/check-boundaries.mjs` — workspace graph/deep-import validator.
- `.github/workflows/foundation.yml` — read-only clean verification.
- `rust-toolchain.toml` — Rust 1.97.0.

### Runtime surfaces

- `apps/desktop/*` — Vite/React composition root.
- `apps/desktop/.storybook/*` — isolated UI workshop.
- `apps/desktop/src-tauri/*` — minimal Tauri shell.

### Packages

- `packages/shared-kernel` — empty stable primitive boundary.
- `packages/game-schema` — schema boundary without schemas yet.
- `packages/game-core` — pure gameplay boundary without formulas yet.
- `packages/game-application` — orchestration boundary.
- `packages/game-content` — immutable content boundary.
- `packages/game-persistence-contracts` — persistence ports boundary.
- `packages/game-platform-contracts` — platform ports boundary.
- `packages/game-ui` — `FoundationStatus` component.
- `packages/game-ui-fixtures` — deterministic UI fixtures.

---

### Task 1: Root workspace and exact toolchain

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.oxlintrc.json`
- Create: `.oxfmtrc.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `rust-toolchain.toml`

**Interfaces:**
- Produces root commands used by every later task and CI.
- Consumes no runtime package API.

- [ ] **Step 1: Add exact root package policy**

Create `package.json` with `private: true`, `type: module`, `packageManager: pnpm@11.11.0`, Node `>=24 <25`, exact Foundation dependencies and these scripts:

```json
{
  "scripts": {
    "docs:check": "node scripts/build-toc.mjs --check",
    "fmt": "oxfmt package.json pnpm-workspace.yaml tsconfig*.json .github scripts tests apps packages",
    "fmt:check": "oxfmt --check package.json pnpm-workspace.yaml tsconfig*.json .github scripts tests apps packages",
    "lint": "oxlint scripts tests apps packages",
    "lint:type-aware": "oxlint --type-aware tests apps packages",
    "typecheck": "tsc -b --pretty false",
    "boundaries:check": "node scripts/check-boundaries.mjs",
    "test": "vitest run",
    "build": "pnpm typecheck && pnpm --filter @runtime-human/desktop build",
    "storybook": "pnpm --filter @runtime-human/desktop storybook",
    "storybook:build": "pnpm --filter @runtime-human/desktop storybook:build",
    "rust:fmt:check": "cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check",
    "rust:check": "cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml",
    "check:fast": "pnpm docs:check && pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm boundaries:check && pnpm test",
    "verify": "pnpm check:fast && pnpm lint:type-aware && pnpm build && pnpm storybook:build && pnpm rust:fmt:check && pnpm rust:check"
  }
}
```

- [ ] **Step 2: Add strict compiler base and references**

`tsconfig.base.json` must include:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,
    "verbatimModuleSyntax": true,
    "composite": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "skipLibCheck": true
  }
}
```

Root `tsconfig.json` has `files: []` and references every package plus `apps/desktop`.

- [ ] **Step 3: Add lint, format and test configs**

`vitest.config.ts` uses jsdom, `tests/setup.ts`, and includes `tests/**/*.test.{ts,tsx}`. The lint configuration enables correctness/suspicious rules without adding ESLint.

- [ ] **Step 4: Add Rust pin and ignore generated output**

`rust-toolchain.toml`:

```toml
[toolchain]
channel = "1.97.0"
components = ["clippy", "rustfmt"]
profile = "minimal"
```

Ignore `node_modules`, `dist`, `storybook-static`, `.turbo`-like build artifacts, TypeScript build info and Rust `target` without ignoring lockfiles.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json .gitignore .oxlintrc.json .oxfmtrc.json vitest.config.ts tests/setup.ts rust-toolchain.toml
git commit -m "build: add exact foundation workspace toolchain"
```

---

### Task 2: Package boundaries and dependency validation

**Files:**
- Create: `packages/*/package.json`
- Create: `packages/*/tsconfig.json`
- Create: `packages/*/src/index.ts`
- Create: `scripts/check-boundaries.mjs`
- Create: `tests/check-boundaries.test.ts`

**Interfaces:**
- Produces `validateWorkspace(root): string[]` and CLI non-zero exit on violations.
- Produces package public entry points consumed by desktop/UI tasks.

- [ ] **Step 1: Write boundary tests first**

Tests must assert:

```ts
expect(validateWorkspace(validFixture)).toEqual([]);
expect(validateWorkspace(uiDependsOnCoreFixture)).toContainEqual(
  expect.stringContaining("game-ui cannot depend on game-core"),
);
expect(validateWorkspace(deepImportFixture)).toContainEqual(
  expect.stringContaining("deep workspace import"),
);
```

- [ ] **Step 2: Run the focused test and confirm failure**

```bash
pnpm vitest run tests/check-boundaries.test.ts
```

Expected: failure because `validateWorkspace` does not exist.

- [ ] **Step 3: Implement manifest graph validation**

`check-boundaries.mjs` must:

- discover `apps/*/package.json` and `packages/*/package.json`;
- merge dependencies/devDependencies/peerDependencies;
- validate workspace package dependencies against an explicit allow-list;
- scan `.ts/.tsx/.mts/.mjs` source files for `@runtime-human/<package>/...` deep imports;
- return stable sorted diagnostics;
- expose `validateWorkspace(root)`;
- exit 1 with one diagnostic per line when invoked as CLI.

- [ ] **Step 4: Add nine package manifests and composite configs**

Every package exports only `./src/index.ts`, is private ESM and has a build/typecheck-compatible tsconfig. Empty boundaries use:

```ts
export {};
```

Do not invent gameplay interfaces.

- [ ] **Step 5: Run tests and checker**

```bash
pnpm vitest run tests/check-boundaries.test.ts
node scripts/check-boundaries.mjs
```

Expected: all tests pass and CLI reports zero violations.

- [ ] **Step 6: Commit**

```bash
git add packages scripts/check-boundaries.mjs tests/check-boundaries.test.ts
git commit -m "build: establish package dependency boundaries"
```

---

### Task 3: Pure UI component and deterministic fixtures

**Files:**
- Create: `packages/game-ui/src/foundation-status.tsx`
- Modify: `packages/game-ui/src/index.ts`
- Create: `packages/game-ui-fixtures/src/foundation-status.fixtures.ts`
- Modify: `packages/game-ui-fixtures/src/index.ts`
- Create: `tests/foundation-status.test.tsx`

**Interfaces:**
- Produces `FoundationStatus(props: FoundationStatusProps): JSX.Element`.
- Produces `foundationReadyFixture` and `foundationLongRussianFixture`.

- [ ] **Step 1: Write render/accessibility smoke tests**

Tests render the canonical fixture and assert heading, status list, semantic list roles and no empty accessible name. A second test renders the long Russian fixture and asserts the full text is present.

- [ ] **Step 2: Run focused tests and confirm failure**

```bash
pnpm vitest run tests/foundation-status.test.tsx
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the component**

Public props:

```ts
export interface FoundationCheck {
  readonly id: string;
  readonly label: string;
  readonly state: "ready" | "planned";
}

export interface FoundationStatusProps {
  readonly title: string;
  readonly summary: string;
  readonly checks: readonly FoundationCheck[];
}
```

The component uses semantic `main`, `h1`, `p`, `ul`, `li` and text labels for states; no color-only meaning and no platform imports.

- [ ] **Step 4: Add serializable fixtures**

Fixtures are readonly plain objects with stable IDs embedded in check entries, fixed text and no current date/randomness.

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm vitest run tests/foundation-status.test.tsx
pnpm typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add packages/game-ui packages/game-ui-fixtures tests/foundation-status.test.tsx
git commit -m "feat(ui): add foundation status component and fixtures"
```

---

### Task 4: React/Vite desktop renderer and Storybook

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/tsconfig.node.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/stories/FoundationStatus.stories.tsx`
- Create: `apps/desktop/.storybook/main.ts`
- Create: `apps/desktop/.storybook/preview.ts`

**Interfaces:**
- Consumes `FoundationStatus` and fixtures through package public exports.
- Produces Vite build and Storybook build commands.

- [ ] **Step 1: Add desktop package manifest**

Use exact React/Vite/Storybook package versions and workspace dependencies only on `game-ui` and `game-ui-fixtures`. Do not add Router, Zustand or Tauri API.

- [ ] **Step 2: Implement the renderer**

`App.tsx` renders `FoundationStatus` with the canonical fixture. `main.tsx` uses `createRoot` and fails clearly when `#root` is missing.

- [ ] **Step 3: Add Storybook configuration and stories**

`main.ts` uses `@storybook/react-vite`, stories glob `../src/**/*.stories.@(ts|tsx)`, and addon-a11y. `preview.ts` sets a11y test severity to error for the canonical story.

Stories:

- `Canonical` with `foundationReadyFixture`;
- `LongRussianText` with `foundationLongRussianFixture`.

- [ ] **Step 4: Run frontend builds**

```bash
pnpm --filter @runtime-human/desktop build
pnpm --filter @runtime-human/desktop storybook:build
```

Expected: both production builds succeed.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/package.json apps/desktop/tsconfig*.json apps/desktop/vite.config.ts apps/desktop/index.html apps/desktop/src apps/desktop/.storybook
git commit -m "feat(desktop): add React renderer and Storybook surface"
```

---

### Task 5: Minimal Tauri shell

**Files:**
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/build.rs`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/capabilities/default.json`

**Interfaces:**
- Produces a shell that loads the Vite renderer and exposes no custom commands.
- Consumes no gameplay package.

- [ ] **Step 1: Add exact Rust dependencies**

```toml
[build-dependencies]
tauri-build = "=2.6.3"

[dependencies]
tauri = "=2.11.5"
```

- [ ] **Step 2: Implement no-command shell**

```rust
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run Runtime Human desktop shell");
}
```

- [ ] **Step 3: Add minimal configuration**

One 1100×720 window, secure CSP, `beforeDevCommand`/`beforeBuildCommand` using pnpm desktop scripts, `frontendDist: ../dist`, and bundle disabled. Capability includes only core default permission for the main window.

- [ ] **Step 4: Run Rust checks**

```bash
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Expected: success and generated `Cargo.lock`.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src-tauri rust-toolchain.toml
git commit -m "feat(desktop): add minimal Tauri shell"
```

---

### Task 6: Lockfiles, generated docs and CI

**Files:**
- Generate: `pnpm-lock.yaml`
- Generate: `apps/desktop/src-tauri/Cargo.lock`
- Update generated: `docs/MANIFEST.jsonc`
- Update generated: `docs/CATALOG.md`
- Create temporarily then remove: `.github/workflows/foundation-bootstrap.yml`
- Create: `.github/workflows/foundation.yml`

**Interfaces:**
- Produces frozen JS/Rust dependency resolution and authoritative clean checks.

- [ ] **Step 1: Add temporary branch-only bootstrap workflow**

The workflow has `contents: write`, runs only on `agent/repository-foundation`, installs exact pnpm, executes `pnpm install --lockfile-only`, `cargo generate-lockfile`, `node scripts/build-toc.mjs`, then commits only both lockfiles and generated docs.

- [ ] **Step 2: Verify generated commit content**

Confirm:

- lockfiles exist;
- no source file was reformatted or generated unexpectedly;
- manifest/catalog include the new spec and plan;
- frozen JS install succeeds.

- [ ] **Step 3: Remove bootstrap workflow**

Delete the write-enabled workflow before final review.

- [ ] **Step 4: Add read-only Foundation CI**

Use pinned checkout/setup-node action SHAs. JS job uses Node 24, Corepack/pnpm 11.11.0, frozen install, `check:fast`, type-aware lint, Vite and Storybook builds. Rust job installs official Linux Tauri prerequisites, uses Rust 1.97.0, and runs locked fmt/check. Set `permissions: contents: read`.

- [ ] **Step 5: Commit**

```bash
git add pnpm-lock.yaml apps/desktop/src-tauri/Cargo.lock docs/MANIFEST.jsonc docs/CATALOG.md .github/workflows/foundation.yml
git commit -m "ci: verify foundation workspace and desktop shell"
```

---

### Task 7: Final verification and pull request

**Files:**
- Review all Foundation changes.
- Update: PR description only.

**Interfaces:**
- Produces reviewable PR #15 against current `main`.

- [ ] **Step 1: Run clean CI-equivalent verification**

Authoritative commands:

```bash
corepack pnpm install --frozen-lockfile
pnpm check:fast
pnpm lint:type-aware
pnpm build
pnpm storybook:build
pnpm rust:fmt:check
pnpm rust:check
```

- [ ] **Step 2: Review scope and dependency tree**

Reject any addition of gameplay formulas, save fields, SQLite, platform API imports, Router, Zustand, Tailwind, Nx/Turborepo or non-exact external dependency version.

- [ ] **Step 3: Confirm branch state**

Compare against `main`: behind must be zero before ready-for-review. Confirm no write-enabled workflow remains.

- [ ] **Step 4: Open draft PR #15**

PR description lists exact commands, CI results, package graph, Tauri limitations, generated files and explicit next PR boundaries.

- [ ] **Step 5: Resolve review/CI findings**

Do not merge while any workflow is pending/failing or any unresolved review thread exists.

- [ ] **Step 6: Final commit/merge gate**

Use squash only after owner review and fresh successful checks.
