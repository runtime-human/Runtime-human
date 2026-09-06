---
name: runtime-simulation
description: Build or use Runtime Human deterministic simulation, fixtures, property tests, repro/replay, trace and explain tooling without replacing product judgement.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human simulation

Read `docs/engineering/GAMECTL.md`, the affected Game Core contracts and the exact fixture/repro sources from the task envelope.

Every evidence run uses explicit deterministic seeds and a named policy or explicit decision sequence. Prefer the smallest evidence that answers the task: a focused fixed-seed run; `pnpm gamectl simulate compare` for comparable reports; a semantic fixture; repro/replay; trace/explain; or property tests for invariant and sequence search.

Do not duplicate the production algorithm inside an oracle. Simulation can prove determinism, reachability, invariants and measured distributions; it cannot prove fun, clarity, visual quality or player preference.

Use only commands and contracts present on the current head. Do not route work through unmerged ENGINE-03 corpus surfaces until those capabilities are integrated into main.

Before completion record seeds/policies or repro path, exact command, relevant metric/invariant result and any remaining playtest or visual-review judgement.
