---
title: "Remote /rh read-only transport v1"
type: plan
status: proposed
canon: false
updated: 2026-08-31
---

# Remote `/rh` read-only transport v1

## Goal

Implement issue #99 as a thin, security-first GitHub `issue_comment` transport over the already-integrated `studioctl` and `gamectl` contracts.

## Scope

Supported commands are exactly:

- `/rh help`
- `/rh capabilities`
- `/rh inspect`
- `/rh game capabilities`

No verification, writes, arbitrary argv, paths, refs, workflow names, environment values, or shell fragments are accepted from comments.

## Architecture

1. `issue_comment.created` starts from the default-branch workflow/control checkout.
2. Trusted control code reads `GITHUB_EVENT_PATH`, parses the command, fetches PR metadata and commenter permission, and emits a typed admission record.
3. Admission rejects plain issues, forks, non-`main` bases, insufficient permissions, malformed SHAs, oversized/unsupported commands, and unsupported repository identity before any target checkout.
4. An admitted exact PR head SHA is checked out separately with `persist-credentials: false`.
5. Trusted runner code maps the typed command enum to fixed argv and uses `spawnSync(..., { shell: false })`.
6. `studioctl` commands run directly from the target checkout. `gamectl capabilities` may install target dependencies only with frozen lockfile and scripts disabled before invoking the fixed gamectl command.
7. Every `/rh` invocation materializes deterministic `runtime-human-remote-result-v1` JSON and a compact Actions summary; v1 uploads artifacts but posts no bot comments.

## Security invariants

- no `pull_request_target` or privileged `workflow_run`;
- no self-hosted runner or secrets;
- workflow token remains read-only;
- comment body is never interpolated into shell source;
- fork PRs are rejected before target checkout;
- accepted commenter permission must resolve to write/maintain/admin-equivalent access;
- exact full SHAs are validated before use;
- target execution is fixed command enum to fixed argv only;
- rejected commands never execute target code.

## TDD sequence

1. Add parser/runner/result tests and workflow forcing tests; prove RED.
2. Implement `remote-command-lib.mjs` and CLI wrapper.
3. Add permanent `.github/workflows/remote-command.yml`.
4. Wire new files into tooling zone/context and `studio:check` forcing functions.
5. Document `/rh` behavior in existing engineering docs and regenerate docs catalog/manifest.
6. Prove normal `feedback` GREEN, then explicit `verify:v3` GREEN on the exact PR head.
7. Merge transport so the workflow exists on `main`.
8. Perform real `issue_comment` E2E with `/rh capabilities` and independently verify the `runtime-human-remote-result-v1` artifact.

## Acceptance

Issue #99 acceptance criteria are authoritative. This plan does not add `/rh verify` or write operations.
