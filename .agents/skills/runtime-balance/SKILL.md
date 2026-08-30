---
name: runtime-balance
description: Change Runtime Human gameplay tuning in the closed balance authoring layer with schema validation, derived-range checks and deterministic simulation evidence without turning tuning into executable rules.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human balance

Use this skill for weights, bonuses, thresholds, bounded ranges and other designer-tunable values already represented by the balance layer. Read `docs/engineering/BALANCE-LAYER.md`, the relevant game-design contract, and only the affected balance/Core consumers from the task envelope.

Start with `pnpm balance:check`. Use `pnpm gamectl simulate run` or `pnpm gamectl simulate compare` when the changed value can affect outcome distribution, dominance, soft locks or progression pace. Use replay/explain evidence when a concrete outcome must be understood.

Keep the algorithm in typed Game Core code. Balance data may contain closed structures such as base values, modifiers, thresholds, weights, ranges and enum mappings; it must not contain formula strings, JavaScript expressions, `eval`, Lua or a generic gameplay DSL. Derived maxima/minima belong to deterministic derivation, not editable duplicated constants.

If the requested change needs a new rule shape, new authoritative state, different RNG semantics or a new effect owner, stop treating it as tuning and route it through `runtime-implement` plus `runtime-architecture` at the appropriate risk.

Before completion report the exact balance sources changed, validation command, simulation/replay evidence where relevant, observed baseline/candidate delta and any remaining playtest judgement that deterministic tooling cannot prove.
