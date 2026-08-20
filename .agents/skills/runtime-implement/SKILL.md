---
name: runtime-implement
description: Implement a bounded Runtime Human code task while preserving repository authority, architecture boundaries and deterministic behavior.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human implementation

Read `docs/agents/AGENT-WORKFLOW.md`. Use `.studio/context-map.json` to load only the task zone. Follow accepted ADR/spec contracts before local patterns.

Prefer a failing test or executable validation fixture when behavior changes. Keep changes minimal and independently testable. Do not mix unrelated refactors or dependency upgrades into the task.

Before completion run focused checks, inspect the diff and return the completion format in `.studio/task-contract.md`.
