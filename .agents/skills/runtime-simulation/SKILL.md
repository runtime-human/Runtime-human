---
name: runtime-simulation
description: Build or use Runtime Human deterministic simulation, fixtures, property tests, repro/replay, trace and explain tooling to evaluate gameplay changes without replacing product judgement.
compatibility: Runtime Human; Codex/OpenCode
---

# Runtime Human simulation

Use this skill for `game-simulation`, deterministic policy runs, fast-check properties, semantic fixtures, repro bundles, replay, trace/explain and baseline/candidate comparison. Read `docs/engineering/GAMECTL.md`, the affected Game Core contracts and the exact fixture/repro sources from the task envelope.

Every run uses explicit deterministic seeds and a named policy or explicit decision sequence. Never use unseeded randomness in evidence. A model/property test must be simpler than the implementation it checks; do not duplicate the production algorithm inside the oracle.

Prefer the smallest evidence that answers the task:

- focused fixed-seed run for a local behavior;
- `pnpm gamectl simulate compare` for tuning or distribution changes;
- semantic fixture for a reusable state;
- repro + replay for a confirmed bug;
- trace/explain for causal inspection;
- fast-check for sequence/invariant search and shrinking.

Simulation can prove determinism, reachability, invariants and measurable distributions. It does not prove fun, clarity, visual quality or player preference; keep those as explicit playtest/visual-review gaps rather than manufacturing a numeric judgement.

Before completion record seeds/policies or repro path, exact command, relevant metric delta or invariant result, and whether the evidence is deterministic, statistical or still requires human playtest judgement.
