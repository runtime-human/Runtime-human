# Studio operating model

## Roles

- **Owner** — product judgment and irreversible trade-offs.
- **Producer** — persistent Codex Sol coordinator; decomposes, routes, asks owner questions, supervises and integrates.
- **Worker** — fresh task context in an isolated worktree when filesystem conflicts or independent branches require it.
- **Reviewer/Evaluator** — fresh read-only context; grades the result against the task and repository invariants rather than continuing implementation.

The Producer does not become a general implementation worker. Keeping coordination context clean is more valuable than saving one worker launch.

## Work in waves, not tickets

Cluster related work by architecture zone and dependencies. Start all independent tasks before waiting. Prefer 8–12 initial weighted units per worker, then recalibrate from measured Runtime Human data. Do not copy another project's batch size as a law.

A worker batch should have one coherent outcome and one acceptance surface. Split when work crosses an authority boundary, creates merge-hotspot overlap, or mixes unrelated validation environments.

## Risk before model

R1: local UI/copy/fixtures/mechanical tests with no authority change.

R2: normal application/content/tooling work with bounded contracts.

R2_COMPLEX: cross-package semantics, content compiler behavior, difficult refactors, or one failed normal attempt.

R3: authoritative game state, MonthRun/resume/idempotency, RNG, fixed-point arithmetic, save/schema/migration, SQLite/CAS, Tauri IPC/capabilities, stable IDs, accepted architecture/product canon.

Use `.studio/models.json` as the only routing table. Kimi K3 is forbidden.

## Generator/evaluator separation

Consequential changes are not accepted solely because their implementer reports success. Use a fresh reviewer context with edit permissions disabled. The reviewer receives the original acceptance criteria, relevant canon, and the diff—not the implementer's long narrative.

R1 can be reviewed in a batch by the Producer unless UI behavior or accessibility warrants QA. Semantic/cross-package R2 normally gets GLM-5.3 review. R3 gets fresh Sol review plus deterministic gates.

## Context engineering

Repository knowledge is the system of record. Workers get a map, not a pasted manual. Use `.studio/context-map.json`; load the base rules, the zone guide and only the relevant ADR/spec/code. Do not bulk-load `docs/MANIFEST.jsonc` or `docs/CATALOG.md` unless the task explicitly needs them.

Task specs point to source files instead of reproducing their contents. This improves cache reuse and prevents stale duplicated rules.

## Owner questions

Only the Producer talks to the Owner by default. Worker questions go to the Producer through Orca. The Producer answers technical questions from repository evidence and escalates only true owner decisions. A pending decision blocks only dependent DAG nodes.

## Verification

Use focused tests during implementation. Serialize heavy full gates through one slot. Never run several Storybook/Rust/full verification jobs concurrently on the same PC just because workers are parallel.

Acceptance evidence is exact: commands, exit codes, tests/results, diff and unresolved risk. "Looks good" is not evidence.

## Failure and retries

Classify failure before retrying:

- harness/tool delivery failure: repair delivery/readiness, then retry same model;
- missing context: improve the task/context map, then retry;
- semantic/model failure: one retry at most, then escalate or decompose;
- architectural ambiguity: owner gate or fresh architect/reviewer, not repeated generation.

After three failed dispatches for one logical task, stop and replan rather than looping.

## Integration

Merge/integrate by dependency order and conflict surface, not completion timestamp. Read risky diffs before integration. Run the full gate on the integrated candidate, not once per trivial card. Preserve branch/PR and human-review rules in `AGENTS.md`.

## Metrics

For each dispatch retain: model/profile, zone, risk, weighted work, wall time, retries, verification time, review findings, rework and accepted outcome. Optimize accepted weighted work per cost/usage after rework—not raw tokens or raw task count.
