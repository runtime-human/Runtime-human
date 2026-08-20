# Sources adopted by Runtime Human Studio

Checked for the August 20, 2026 studio design:

- OpenAI, **Harness engineering: leveraging Codex in an agent-first world** (2026-02-11): repository knowledge as system of record, maps over monolithic manuals, mechanical architecture constraints, agent-legible runtime/feedback loops, continuous entropy cleanup.
- Anthropic, **Harness design for long-running application development** (2026-03-24): planner/generator/evaluator separation and structured handoff artifacts.
- Anthropic, **Building a C compiler with a team of parallel Claudes** (2026-02-05): parallel-agent decomposition and test-driven coordination lessons.
- StablyAI Orca current `skill-guides/orchestration.md`: Run/Task/Dispatch lifecycle, `ask`/`reply`, decision gates, `worker_done`, shallow DAGs, rolling `check --wait`, worker release/reuse and worktree/terminal supervision.
- Orca issue #13488: Claude cold-composer prompt race; fixed on main 2026-08-13 and closed 2026-08-14. It is historical evidence, not a permanent workaround.
- Orca issue #13439: Codex/MCP startup race remained open on 2026-08-20; motivates explicit readiness/turn verification for fresh Codex R3 workers.
- Orca issue #13539: Windows Codex sandbox named-pipe access to Orca remained open; motivates recovery without weakening sandbox isolation.
- Orca Windows setup-shell reference and issue #9926: native `.cmd` setup semantics and historical wait-for-setup quoting/path hazards.
- OpenCode current config/permission/agent/Go docs: `subagent_depth: 0`, lazy `.agents/skills`, granular permissions, `default_agent`, sharing control, compaction/pruning, watcher ignores and Go model IDs.
- `studioigor/gamestudio`: large batches, risk-based review, real-play acceptance and process minimization.
- GameDevBench, ICML 2026: game-development agent benchmark; visual feedback materially improves agent evaluation on game tasks.
- OrchBench (2026-07): orchestration-plan evaluation; preserving task-critical context matters more than simply adding agents, with diminishing returns from coordination overhead.

These sources inform orchestration only. They do not override Runtime Human canon.
