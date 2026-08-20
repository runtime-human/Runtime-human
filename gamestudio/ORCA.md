# Orca operating notes

Always prefer the version-matched Orca guide from the installed runtime (`orca skills get orchestration`) over remembered flags. Orca ships quickly and its supervised-worker contract has changed during August 2026.

## Supervised lifecycle

The Producer owns an Orca Run and creates Tasks before dispatching. Use `task-list --brief --json` for coordinator sweeps and rolling `check --wait` windows instead of sleep/poll loops. Keep dependency chains shallow (normally <= 4).

Workers send exactly one `worker_done` for the live dispatch. After an accepted completion, explicitly reuse the exact worker for an immediate follow-up or call `worker-release`; do not leak completed agent terminals.

Worker questions use Orca `ask`; the Producer answers with `reply` or turns a true product/architecture choice into an Owner decision gate.

```text
# worker
orca orchestration ask --question "<question>" --options "yes,no" --timeout-ms 600000 --json

# Producer
orca orchestration reply --id <message-id> --body "<answer>" --json
```

## Owner decision gates

When an Owner answer blocks one task or its dependents, persist the decision in Orca as well as asking in the Producer chat:

```text
orca orchestration gate-create --task <task-id> --question "<decision>" --options '["A","B","C"]' --json
# ask the Owner in the Producer chat; independent tasks continue
orca orchestration gate-resolve --id <gate-id> --resolution "<owner answer>" --json
```

Never create a synthetic answer just to unblock a gate.

## OpenCode workers

Use the installed Orca skill to choose the best supported path. If the current runtime supports an `opencode` agent launcher plus model forwarding, prefer the composed supervised `worker-start` path because current Orca owns readiness, dispatch provenance and cleanup.

If the installed runtime does not expose the required OpenCode model/profile through `worker-start`, use the low-level custom-command path and keep the explicit readiness gate:

```text
orca worktree create --name <task-name> --no-parent --setup run --json
orca terminal create --worktree id:<full-worktree-id> --title <task-name> --command "opencode --agent worker --model opencode-go/deepseek-v4-flash" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
orca orchestration dispatch --task <task-id> --to <handle> --inject --json
orca orchestration worker-read --dispatch <dispatch-id> --limit 20 --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
```

Use `--agent content --model opencode-go/deepseek-v4-pro` for content, and `--agent review --model opencode-go/glm-5.3` for the read-only R2 evaluator. Target only the agent handle returned by terminal creation; a bare worktree create may leave a fallback shell when custom argv is required.

Do not treat terminal bytes as semantic success: inspect the dispatch receipt and, after any suspicious cold start, confirm `worker-read` has a real turn/transcript before assuming the worker is progressing.

## Codex R3 workers on Windows

The Claude-specific cold-composer bug reported as Orca #13488 was fixed upstream on 2026-08-13 and the issue was closed on 2026-08-14. Do not keep a permanent workaround for that closed bug.

However, as of 2026-08-20 Orca #13439 (Codex prompt/MCP startup race) remains open. For fresh Codex R3 workers, especially when MCP startup is heavy, use the explicit readiness path unless the installed version-matched guide/receipt proves a stronger turn-start contract:

```text
orca worktree create --name <task-name> --no-parent --setup run --json
orca terminal create --worktree id:<full-worktree-id> --title <task-name> --command "codex --model gpt-5.6-sol -c model_reasoning_effort=high" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 300000 --json
orca orchestration dispatch --task <task-id> --to <handle> --inject --json
orca orchestration worker-read --dispatch <dispatch-id> --limit 20 --json
```

If a prompt is visibly present but no turn started, retry only submission/Enter according to the current Orca recovery receipt; never paste the task body a second time.

There is also an open Windows issue (#13539) where a sandboxed Codex process cannot write to Orca's named pipe. If the Codex worker finishes its repository work but cannot emit `worker_done` with an EPERM/`runtime starting` symptom, do **not** disable the Codex sandbox just to restore lifecycle RPC. The Producer should verify `worker-read`, the actual diff and required gates, record the outcome with an explicit Orca task recovery/update, then release/clean up according to the current skill. Treat this as harness recovery, not a model failure.

## Setup on Windows

`orca.yaml` intentionally uses plain batch-compatible commands. On native Windows Orca runs a setup script as `.cmd` unless the script declares a shebang. Do not add POSIX-only setup syntax unless Git Bash is an explicit repository requirement.

Do not enable a repository-wide `wait-for-setup` policy merely as a workaround without checking the installed Orca version: Windows setup sequencing has had its own quoting/path bugs. Read the setup receipt and distinguish setup state from agent readiness.

## Worktree choice

Use a top-level worktree for independent work based on the repository default branch. Use child/stacked lineage only when a task actually depends on an active feature branch. Reuse the current worktree when a task explicitly needs current/uncommitted state or when a new checkout is unnecessary and there is no write conflict.

Orca lineage and Git base are separate: `--no-parent` does not itself choose a Git base.
