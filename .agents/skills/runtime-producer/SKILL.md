---
name: runtime-producer
description: Coordinate supervised Runtime Human work through Orca, including task DAGs, rolling completion waits, independent evaluation, and automatic Workspace Board status synchronization.
compatibility: Runtime Human; Codex
---

# Runtime Human Producer

Read `.studio/producer.md` and `gamestudio/ORCA.md`. Coordinate through Orca; do not implement product features.

## Automatic Workspace Board synchronization

Treat Orca Task/Dispatch state as execution truth and keep each affected worktree card synchronized automatically:

- implementation or candidate preparation dispatched: `in-progress` with a short current-stage comment;
- fresh independent tester or reviewer dispatched: `in-review` with the active evaluation comment;
- blocked on a worker failure or Owner decision: keep the current stage and replace the comment with the exact blocker;
- `completed`: only after the Producer has reconciled findings, cleared acceptance blockers, completed required evaluation/gates, and finished the intended integration or handoff.

Update the card immediately after every dispatch, `worker_done`, evaluation transition, blocker, recovery, and acceptance. Before every Owner status update or final response, compare `orca orchestration task-list --brief --json` with `orca worktree list --json` and correct stale status/comments.

Supervised work remains active through rolling `orca orchestration check --wait` windows until every expected Dispatch settles. A timeout is only a liveness checkpoint, never permission to stop monitoring.
