---
title: "Cheap PR Feedback and Candidate V3 Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-08-31
---

# Cheap PR Feedback and Candidate V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop running the complete Windows/Rust/browser V3 after every PR-head push while preserving exact, authoritative V3 evidence for an explicitly selected immutable candidate.

**Architecture:** Continuous PR iteration gets a read-only `feedback` workflow that runs the existing `pnpm check:fast` command on `windows-2025`. The existing `foundation` workflow keeps `pnpm verify` as the sole V3 authority, but for PRs it runs only when the `verify:v3` label is explicitly added. `push: main` and `workflow_dispatch` retain full V3. The label event payload supplies the exact PR head while default `pull_request` checkout tests the synthetic merge candidate; `runtime-human-pr-evidence-v1` records base/head/tested SHA and V3 outcome.

**Tech Stack:** GitHub Actions `pull_request` activity types, Windows Server 2025 hosted runner, Node 24.20.0, pnpm 11.11.0, existing `pnpm check:fast`, `pnpm verify`, `studioctl evidence`.

**Spec:** issue #87 and `docs/engineering/VERIFICATION-TIERS.md`.

## Global Constraints

- `pnpm verify` remains the only V3 authority.
- Continuous feedback must not be described as V2/V3; it is a broad non-authoritative fast gate.
- No Rust toolchain install, Playwright browser install, Storybook build, Rust tests or release work in continuous feedback.
- PR V3 is admitted only by `pull_request` action `labeled` with label `verify:v3`.
- A later `synchronize` event must not run V3 merely because the label remains attached.
- V3 continues to test the merge candidate and publish `runtime-human-pr-evidence-v1` with exact base/head/tested identities.
- All workflows remain `contents: read`, with no secrets, self-hosted runner, `pull_request_target`, privileged `workflow_run`, arbitrary shell transport or Rulesets dependency.
- Existing concurrency cancellation must prevent obsolete PR runs from consuming unnecessary minutes.
- Do not duplicate the fast/full verification command bodies in YAML; call `pnpm check:fast` and `pnpm verify`.

---

## File Map

- Create `.github/workflows/feedback.yml`: continuous non-authoritative fast gate for normal PR iteration.
- Modify `.github/workflows/foundation.yml`: PR trigger becomes `types: [labeled]`; full job is gated to `verify:v3`, while push/main and workflow_dispatch remain authoritative V3 paths.
- Create `tests/ci-feedback-candidate.test.ts`: workflow admission/security/regression contract.
- Modify `vitest.config.ts`: register the CI contract test in tooling-node.
- Modify `scripts/studio/check-control-plane.mjs`: forcing function for permanent feedback/foundation wiring.
- Modify `docs/engineering/VERIFICATION-TIERS.md`: document continuous feedback versus authoritative V3.
- Regenerate `docs/CATALOG.md` and `docs/MANIFEST.jsonc` canonically.

---

### Task 1: RED workflow contract

- [ ] Add `tests/ci-feedback-candidate.test.ts` asserting:
  - `feedback.yml` exists, is read-only, runs on normal PR iteration, uses `windows-2025`, calls exactly the existing fast gate, and contains no `pnpm verify`, Rust setup or Playwright installation;
  - `foundation.yml` retains push/main and workflow_dispatch, listens to PR `labeled`, admits the full job only for `verify:v3`, retains `pnpm verify`, exact evidence publication and read-only permissions;
  - the V3 condition depends on `github.event.action == 'labeled'` and `github.event.label.name == 'verify:v3'`, so synchronize cannot accidentally run full V3.
- [ ] Add the test to the tooling Vitest project.
- [ ] Obtain a GitHub-hosted RED run before production workflow changes.

### Task 2: GREEN workflow split

- [ ] Create `.github/workflows/feedback.yml` using permanent SHA-pinned checkout/pnpm/setup-node actions and `pnpm check:fast` only.
- [ ] Give feedback its own PR-number concurrency group with `cancel-in-progress: true`.
- [ ] Change foundation PR activity to `types: [labeled]`.
- [ ] Gate `full-verification` with:

```yaml
if: >-
  github.event_name != 'pull_request' ||
  (github.event.action == 'labeled' && github.event.label.name == 'verify:v3')
```

- [ ] Keep the existing V3/evidence/failure-preservation steps unchanged.
- [ ] Update `check-control-plane.mjs` so accidental reintroduction of per-push V3 or removal of fast feedback fails `studio:check`.

### Task 3: Documentation and generated outputs

- [ ] Update `VERIFICATION-TIERS.md`: continuous `feedback` is non-authoritative; `verify:v3` is the current GitHub-native candidate trigger; V3 evidence must match current head before merge.
- [ ] Regenerate docs with `node scripts/build-toc.mjs` and verify `pnpm docs:check`.

### Task 4: Exact remote proof

- [ ] Open a draft PR logically stacked on #88 and targeted to `main` so current PR workflows execute.
- [ ] Verify a normal synchronize push runs `feedback` but does not execute full V3.
- [ ] Create/use repository label `verify:v3`, add it explicitly to the PR, and verify the labeled event runs full foundation V3.
- [ ] Require exact-head `feedback`, `docs`, `pr-title` success and exact candidate `foundation` success.
- [ ] Download/read the V3 evidence artifact and confirm its `headSha` equals the immutable PR candidate at label time and `testedSha` is the tested merge commit.
- [ ] Record observed feedback and V3 durations as the first before/after measurement for issue #87.
- [ ] Self-review for read-only permissions, no privileged events, no duplicate command bodies and no product/runtime changes.
