---
name: runtime-harness
description: Modify Runtime Human AI/developer harness tooling such as Studio, Nx, gamectl and Storybook agent integration while preserving gameplay authority and measuring developer-loop impact.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human harness

Use this skill for `.studio` policy/tooling, Nx affected/cache integration, `gamectl` developer interfaces, Storybook agent integration and repository-owned automation. Read `docs/architecture/AI-FIRST-GAME-DEVELOPMENT.md`, `docs/engineering/VERIFICATION-TIERS.md` and only the affected harness code from the task envelope.

Harness code coordinates or explains development; it does not become gameplay authority. Do not add a second outer orchestrator, an unrestricted filesystem/shell proxy, a generic MCP wrapper for every CLI command or a duplicated model-routing table. `.studio/models.json` remains the sole model-profile authority.

Machine-consumed outputs use an explicit versioned schema and deterministic ordering. Prefer reusable library/CLI behavior over agent-only prose. Prefer mechanical guards/tests over adding another instruction paragraph when a failure class is statically or behaviorally detectable.

Changes that reduce verification or reviewer cost start as measured shadow recommendations. Do not weaken R3 persistence/schema/determinism/security/release evaluation without repository evidence and the required human gate.

Before completion prove that the harness change does not silently alter gameplay contracts, run the narrow tooling checks first, report the relevant task-loop metric when available, and identify any remaining dependency on future scenario/authoring/persistence tooling.
