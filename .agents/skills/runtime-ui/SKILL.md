---
name: runtime-ui
description: Implement Runtime Human React/Storybook UI changes with casual-first information density, accessibility and no leakage of authoritative state ownership into the renderer.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human UI

Read `docs/agents/UI-AGENT.md`, the relevant game-design specification and only the affected UI code.

Keep normal screens bounded and human-readable. Renderer code does not own authoritative game state or raw SQL. UI changes update stories/tests/fixtures when contracts change. Check keyboard/accessibility and long Russian text for user-facing changes.

Use visual/runtime evidence when the task changes layout, interaction or game feel; DOM/unit checks alone are not equivalent to executable behavior.
