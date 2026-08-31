---
title: "PR Evidence Plane Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-08-31
---

# PR Evidence Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить компактный `runtime-human-pr-evidence-v1`, который связывает exact PR base/head, фактически проверенный commit и canonical V3 outcome в отдельный Actions artifact, пригодный для ChatGPT/reviewer без чтения полного лога.

**Architecture:** `studioctl evidence` переиспользует `inspectChange` и не получает собственной verification policy. Evidence builder валидирует immutable identities и принимает только наблюдённый outcome уже выполненного `pnpm verify`; GitHub Actions отвечает за orchestration, summary и artifact upload, а финальный job status по-прежнему определяется canonical V3.

**Tech Stack:** Node 24.20.0, pnpm 11.11.0, Vitest 4.1.10, GitHub Actions `windows-2025`, `actions/upload-artifact@v7.0.1` pinned by immutable commit SHA.

**Spec:** `docs/engineering/STUDIOCTL.md` and issue #86 (`feat(tooling): add machine-readable PR evidence plane`).

## Global Constraints

- `pnpm verify` остаётся единственным V3 authority.
- `studioctl evidence` read-only относительно tracked repository state; generated files живут только в `.studio/runtime/evidence/` на runner.
- Evidence различает `baseSha`, `headSha` и `testedSha`; ни одно поле не подменяет другое.
- Для `pull_request` `testedSha` может быть synthetic merge commit и обязан отражать реально checkout/verified commit.
- Нельзя заявлять game fingerprints до появления `gamectl fingerprint`.
- Нельзя добавлять write token, secrets, self-hosted runner, `pull_request_target`, privileged `workflow_run`, backend service или MCP wrapper.
- V3 failure не должен препятствовать созданию evidence artifact, но итоговый foundation job обязан остаться failed.
- Capability discovery рекламирует `evidence` только после работающей реализации.

---

## File Map

- Create `scripts/studio/evidence-lib.mjs`: schema validation, immutable identity resolution, evidence assembly, deterministic JSON and Markdown summary.
- Create `scripts/studio/evidence-lib.d.mts`: public declarations for tests/tooling.
- Modify `scripts/studio/control-plane-lib.mjs` and `.d.mts`: expose exact commit resolver used by inspection and evidence instead of duplicating Git semantics.
- Modify `scripts/studioctl.mjs`: add strict `evidence` command and file outputs.
- Create `tests/studio-pr-evidence.test.ts`: contract, success/failure, malformed inspection and synthetic-merge identity coverage.
- Modify `tests/studioctl-cli.test.ts`: installed capability map now includes evidence.
- Modify `.github/workflows/foundation.yml`: preserve V3 outcome, always materialize PR evidence, append short-retention artifact, then re-fail failed V3.
- Modify `docs/engineering/STUDIOCTL.md`: document the installed evidence contract and GitHub SHA semantics.
- Regenerate `docs/CATALOG.md` and `docs/MANIFEST.jsonc` with the canonical docs generator.

---

### Task 1: Lock the evidence contract with RED tests

**Files:**
- Create: `tests/studio-pr-evidence.test.ts`
- Modify: `tests/studioctl-cli.test.ts`

**Interfaces:**
- Consumes: `inspectChange(root, { base, head })` and exact commit resolution from Studio control-plane.
- Produces expectation for `PR_EVIDENCE_SCHEMA`, `buildPrEvidence`, `collectPrEvidence`, `serializePrEvidence`, `renderPrEvidenceSummary` and installed `evidence: 1` capability.

- [ ] **Step 1: Write failing contract tests**

Cover a temporary Git repository where `base`, `head` and a synthetic merge `testedSha` are three different 40-character SHAs. Assert this closed shape:

```js
{
  schemaVersion: "runtime-human-pr-evidence-v1",
  baseSha,
  headSha,
  testedSha,
  inspection: { schemaVersion: "runtime-human-change-inspection-v1", ... },
  verification: {
    tier: "V3",
    authority: "pnpm verify",
    status: "success" | "failure",
    result: { command: "pnpm verify", ok: boolean, code: number }
  }
}
```

Also assert deterministic serialization, summary output, failure outcome preservation, malformed/missing inspection rejection, and capability discovery containing `evidence: 1` only after implementation.

- [ ] **Step 2: Run the focused tooling tests**

Run:

```sh
pnpm exec vitest run tests/studio-pr-evidence.test.ts tests/studioctl-cli.test.ts
```

Expected: FAIL because evidence library/command/schema do not exist and capabilities still omit evidence.

- [ ] **Step 3: Commit the RED tests**

Commit message:

```text
test(tooling): define PR evidence contract
```

### Task 2: Implement the evidence library and CLI

**Files:**
- Create: `scripts/studio/evidence-lib.mjs`
- Create: `scripts/studio/evidence-lib.d.mts`
- Modify: `scripts/studio/control-plane-lib.mjs`
- Modify: `scripts/studio/control-plane-lib.d.mts`
- Modify: `scripts/studioctl.mjs`

**Interfaces:**
- `resolveCommit(root: string, ref: string): string` returns a verified lowercase full SHA.
- `collectPrEvidence(root, input)` resolves exact identities, calls `inspectChange`, then delegates to `buildPrEvidence`.
- `buildPrEvidence(input)` accepts a validated inspection projection plus observed V3 outcome; it never runs verification itself.
- `serializePrEvidence(value)` returns deterministic pretty JSON with exactly one trailing newline.
- `renderPrEvidenceSummary(value)` returns compact Markdown without log excerpts or secrets.

- [ ] **Step 1: Export the existing exact commit resolver**

Reuse the implementation already used by `inspectChange`; do not add a second `git rev-parse` implementation.

- [ ] **Step 2: Implement strict evidence assembly**

Reject non-full SHAs, wrong inspection schema, inspection/base/head mismatch, unsupported status values, negative/non-integer exit codes and contradictory status/result combinations (`success` requires code `0`; `failure` requires non-zero code).

- [ ] **Step 3: Add `studioctl evidence`**

Accepted arguments:

```text
studioctl evidence --base <ref> --head <ref> --tested <ref> --status <success|failure> --exit-code <n> [--output <path>] [--summary-output <path>] [--json]
```

The command always records tier `V3` and authority `pnpm verify` in v1. It creates only explicitly requested output directories/files; otherwise it only prints.

- [ ] **Step 4: Make capability discovery truthful**

Change installed map to:

```js
{ capabilities: 1, inspect: 1, evidence: 1 }
```

and add `contracts.evidence = "runtime-human-pr-evidence-v1"`.

- [ ] **Step 5: Run focused tests**

Run the Task 1 command again.

Expected: PASS.

- [ ] **Step 6: Commit GREEN implementation**

Commit message:

```text
feat(tooling): add PR evidence contract
```

### Task 3: Integrate evidence with authoritative foundation CI

**Files:**
- Modify: `.github/workflows/foundation.yml`

**Interfaces:**
- Inputs from GitHub PR event: `pull_request.base.sha`, `pull_request.head.sha`, `github.sha`.
- Output artifact name: `runtime-human-pr-evidence-${{ github.event.pull_request.number }}-${{ github.event.pull_request.head.sha }}`.
- Artifact payload: `.studio/runtime/evidence/runtime-human-pr-evidence-v1.json`.

- [ ] **Step 1: Ensure exact refs are locally resolvable**

Set checkout `fetch-depth: 2` so the synthetic merge candidate and both parents are available without fetching the full repository history.

- [ ] **Step 2: Preserve canonical V3 outcome without short-circuiting evidence**

Give the `pnpm verify` step id `v3`, write its actual `$LASTEXITCODE` to `GITHUB_OUTPUT`, and set `continue-on-error: true`.

- [ ] **Step 3: Generate PR evidence on success and failure**

For `pull_request` events and `always()`, invoke:

```sh
pnpm studioctl evidence --base <baseSha> --head <headSha> --tested <github.sha> --status <steps.v3.outcome> --exit-code <steps.v3.outputs.exit_code> --output .studio/runtime/evidence/runtime-human-pr-evidence-v1.json --summary-output .studio/runtime/evidence/summary.md
```

Map only GitHub outcomes `success` and `failure`; if V3 is cancelled/skipped, evidence generation must fail closed rather than invent a verification result.

- [ ] **Step 4: Publish compact summary and short-retention artifact**

Append `summary.md` to `GITHUB_STEP_SUMMARY`. Upload the JSON with `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (`v7.0.1`), `retention-days: 7`, `if-no-files-found: error`.

- [ ] **Step 5: Restore authoritative failure semantics**

After evidence publication, add a final step that exits non-zero whenever `steps.v3.outcome != 'success'`. Evidence collection therefore cannot convert a failed V3 into a green job.

- [ ] **Step 6: Commit workflow integration**

Commit message:

```text
ci: publish exact PR evidence
```

### Task 4: Synchronize documentation and run final verification

**Files:**
- Modify: `docs/engineering/STUDIOCTL.md`
- Regenerate: `docs/CATALOG.md`
- Regenerate: `docs/MANIFEST.jsonc`

**Interfaces:**
- Documentation must advertise only the implemented v1 fields and current workflow semantics.

- [ ] **Step 1: Update STUDIOCTL documentation**

Document `evidence`, the distinction between base/head/tested SHA, V3 authority, failure-artifact behavior and seven-day PR artifact retention. Keep `/rh`, CI tier splitting and game fingerprints deferred.

- [ ] **Step 2: Regenerate docs outputs**

Run the canonical docs generator (without `--check`), then verify with:

```sh
pnpm docs:check
```

- [ ] **Step 3: Run focused tooling verification**

```sh
pnpm exec vitest run tests/studio-pr-evidence.test.ts tests/studioctl-cli.test.ts
pnpm studio:check
pnpm fmt:check
pnpm lint
pnpm typecheck
```

Expected: all pass (warning-only lint output is allowed by the repository contract).

- [ ] **Step 4: Open a draft PR against `main`**

The PR remains logically stacked on #85. Its body must give the clean review range `a590a577767d3491d663230fb5e9a3b616f7d181..<head>` and explain why base remains `main` until the parent PRs are integrated.

- [ ] **Step 5: Observe GitHub-hosted V3 and artifact**

Require exact-head `pr-title`, `docs` and `foundation` success. Download/read the emitted workflow artifact and verify its `baseSha`, `headSha`, `testedSha`, inspection projection and successful V3 result independently of console logs.

- [ ] **Step 6: Self-review final diff**

Confirm no game/runtime behavior, persistence contract, Rulesets, privileged trigger, secrets or write permissions were added; confirm the workflow still fails when canonical V3 fails.

- [ ] **Step 7: Update the single PR checkpoint**

After unchanged-head GREEN evidence, update one `runtime-human-chat-checkpoint-v1` comment with exact run/artifact IDs and the next issue (#87).
