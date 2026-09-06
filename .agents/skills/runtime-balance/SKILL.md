---
name: runtime-balance
description: Change Runtime Human gameplay tuning in the closed balance authoring layer with schema validation, derived checks and deterministic gameplay evidence.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human balance

Read `docs/engineering/BALANCE-LAYER.md`, the relevant game-design contract and only the affected balance/Core consumers from the task envelope.

Use this skill for weights, bonuses, thresholds, bounded ranges and other designer-tunable values already represented by the closed balance layer. Start with `pnpm balance:check`. Use deterministic simulation, replay or explain evidence when a changed value can affect outcome distribution, dominance, soft locks or progression pace.

Keep algorithms in typed Game Core code. Balance data contains closed tuning structures only; it is not an executable rule language. Derived maxima and minima belong to deterministic derivation rather than duplicated editable constants.

If the requested change needs a new rule shape, authoritative state, RNG semantics or effect owner, stop treating it as tuning and route the task through the owning code and architecture boundary.

Before completion report exact balance sources changed, `pnpm balance:check`, relevant deterministic evidence and any remaining playtest judgement.
