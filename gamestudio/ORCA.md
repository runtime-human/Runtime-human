# Orca operating notes

Always prefer the version-matched Orca guide from the installed runtime (`orca skills get orchestration`) over remembered flags. Orca changes quickly.

## Supervised lifecycle

The Producer owns an Orca Run and creates Tasks before dispatching. Use `task-list --brief --json` for coordinator sweeps and `check --wait` for blocking waits instead of sleep/poll loops. Keep dependency chains shallow.

Worker questions use Orca `ask`; the Producer answers or converts the question into an Owner gate. Workers send exactly one `worker_done` for the active dispatch.

## Readiness-safe dispatch

As of August 2026, Orca has had real prompt-delivery/readiness races where a command receipt can exist before a TUI has actually started the turn. Do not treat bytes written to a terminal as proof that work began.

For a fresh custom-model OpenCode worker, use the explicit path:

```text
orca worktree create --name <task-name> --no-parent --setup run --json
orca terminal create --worktree id:<full-worktree-id> --title <task-name> --command "opencode --model opencode-go/deepseek-v4-flash" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
orca orchestration dispatch --task <task-id> --to <handle> --inject --json
orca orchestration worker-read --dispatch <dispatch-id> --limit 20 --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
```

Swap the model only according to `.studio/models.json` (`deepseek-v4-pro`, `glm-5.3`, etc.). Verify that `worker-read` has a real transcript/turn. If delivery is missing, repair the harness state; never resend the whole prompt blindly and create duplicate turns.

For Codex R3/custom effort, launch the terminal with the requested Codex model/effort, wait for `tui-idle`, then inject the Orca dispatch. Do not assume Orca's built-in agent launcher forwards model-specific CLI arguments.

If a future Orca release guarantees turn-start semantics in composed `worker-start`, the Producer may use the newer version-matched path after confirming it in the installed guide.

## Windows

`orca.yaml` intentionally uses simple setup commands that work without a Bash-only script. Native-Windows setup shell behavior has changed across Orca releases; do not add POSIX-only setup syntax unless Git Bash is an explicit project requirement.

Do not run several heavy setup/full-gate jobs concurrently. Repository setup may run alongside agent startup; inspect the setup receipt before assuming dependencies are ready.

## Worktree choice

Use a top-level worktree for independent work based on `main`. Use child/stacked worktrees only when the task actually depends on an active feature branch. Reuse the current worktree only when the task explicitly needs uncommitted/current-branch state or there is no write conflict.
