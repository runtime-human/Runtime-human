# Sources adopted by Runtime Human Studio

Checked for the August 2026 studio design:

- OpenAI, **Harness engineering: leveraging Codex in an agent-first world** (2026-02-11): repository knowledge as system of record, maps over monolithic manuals, mechanical architecture constraints, agent-legible runtime/feedback loops, continuous entropy cleanup.
- Anthropic, **Harness design for long-running application development** (2026-03-24): planner/generator/evaluator separation and structured handoff artifacts.
- Anthropic, **Building a C compiler with a team of parallel Claudes** (2026-02-05): parallel-agent decomposition and test-driven coordination lessons.
- StablyAI Orca current `skill-guides/orchestration.md`: Run/Task/Dispatch lifecycle, `ask`/`worker_done`, shallow DAGs, `check --wait`, worktree/terminal supervision.
- Orca issue #13488 (opened 2026-08-10): prompt injected before TUI readiness; motivates explicit readiness/turn verification.
- OpenCode current docs: `subagent_depth: 0`, project `AGENTS.md`, lazy `.agents/skills`, granular permissions, OpenCode Go model IDs.
- `studioigor/gamestudio`: large batches, risk-based review, real-play acceptance and process minimization.
- GameDevBench, ICML 2026: game-development agent benchmark; visual feedback materially improves agent evaluation on game tasks.
- OrchBench (2026-07): orchestration-plan evaluation; preserving task-critical context matters more than simply adding agents, with diminishing returns from coordination overhead.

These sources inform orchestration only. They do not override Runtime Human canon.
