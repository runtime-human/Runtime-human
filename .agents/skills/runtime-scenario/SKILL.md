---
name: runtime-scenario
description: Change Runtime Human typed scenario-v1 authoring, compilation, capability resolution, certification and bounded gamectl scenario tooling without creating a generic gameplay language.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human scenario

Read `docs/engineering/GAMECTL.md`, the exact scenario contracts and only the affected runtime adapter/Core boundaries from the task envelope.

Use this skill for scenario-v1 source, ScenarioProgramV1, capability registry/resolution, certification, scenario artifacts and the existing scenario CLI. Current commands are `pnpm gamectl scenario check`, `pnpm gamectl scenario compile`, `pnpm gamectl scenario inspect` and `pnpm scenario:check`; supply the required source, registry or artifact arguments for the concrete task.

Keep the language closed and typed. Scenario data orchestrates declared capabilities; authoritative domain handlers own state effects. Do not introduce a second MonthRun state machine, second RNG authority or unchecked runtime authoring path.

Changes to instruction shape, public schema, capability semantics, certificate/RNG semantics, MonthRun compatibility or checkpoint behavior require the owning Core/architecture risk path rather than ordinary scenario authoring.

Before completion report analyzer/compiler/certificate evidence, exact fingerprints or bounds when relevant, and runtime equivalence/replay evidence when execution authority is affected.
