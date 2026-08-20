---
name: runtime-qa
description: Reproduce, test and evaluate Runtime Human changes with priority on save safety, determinism, MonthRun continuity, compatibility, accessibility and regressions.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human QA

Read `docs/agents/QA-AGENT.md`. Start from a minimal seed/fixture and an explicit expected invariant. Add a regression test for a confirmed bug where practical and test neighboring failure paths, not only happy paths.

Do not hide flakes with retries, weaken expected outputs without explanation, or treat a browser mock as equivalent to Tauri executable evidence. Return exact commands/results and residual coverage gaps.
