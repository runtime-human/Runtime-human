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

Review defects follow the same rule: accumulate and cluster by shared context, then dispatch a coherent fix batch. Do not start one worker per review comment.

## Risk before model

R1: local UI/copy/fixtures/mechanical tests with no authority change.

R2: normal application/content/tooling work with bounded contracts.

R2_COMPLEX: cross-package semantics, content compiler behavior, difficult refactors, systemic review classes, or one failed normal attempt.

R3: authoritative game state, MonthRun/resume/idempotency, RNG, fixed-point arithmetic, save/schema/migration, SQLite/CAS, Tauri IPC/capabilities, stable IDs, accepted architecture/product canon, or any review finding whose impact blocks those invariants.

Do not select a model by recollection. Run `pnpm studio:route -- --zone <zone> --risk <risk>`; the router enforces zone minimum risk and `.studio/models.json`. Kimi K3 is forbidden.

## Generator/evaluator separation

Consequential changes are not accepted solely because their implementer reports success. Use a fresh reviewer context with edit permissions disabled. The reviewer receives the original acceptance criteria, relevant canon, and the diff—not the implementer's long narrative.

R1 can be reviewed in a batch by the Producer unless UI behavior or accessibility warrants QA. Semantic/cross-package R2 normally gets GLM-5.3 review. R3 gets fresh Sol review plus deterministic gates.

The evaluator reports candidate findings in `.studio/finding-contract.md` format. It never edits the implementation or the finding ledger. The Producer validates/dispositions findings; this preserves reviewer independence and gives the ledger one normal writer.

## Review Finding Ledger

The durable open ledger is `.studio/findings/ledger.jsonl`; verified/closed findings are archived in `.studio/findings/resolved.jsonl`. Policy is machine-readable in `.studio/finding-policy.json`.

Classify every validated finding on three independent axes:

- severity: `S0..S4` impact;
- size: `XS..XL` expected agent-work size, not human hours;
- scope: `local|zone|cross-zone|systemic` blast radius.

Use the stable fingerprint `zone:component:category:invariant` as failure-class identity. Repeated evidence increments `occurrences` and merges evidence rather than multiplying duplicate bug rows.

Disposition is separate from classification: `BLOCK`, `FIX_NOW`, `LEDGER`, `DUPLICATE`, `INVALID`, `ACCEPTED_RISK`, or `OWNER_DECISION`. S0/S1 remain acceptance blockers regardless of estimated fix size.

After a review wave, the Producer records validated findings, promotes recurring classes, and clusters open findings. The cluster score combines aggregate size, recurrence pressure, shared-context cohesion and serious-severity pressure. A cluster becomes a fix batch because its context is coherent, not simply because an arbitrary number of comments exists.

Recurring classes at the policy threshold become `systemic` and must trigger prevention consideration. Prefer a regression test/fixture, validator or architecture guard, and/or a focused agent skill/context correction. The goal is to make repeated failures rarer, not merely to collect them.

A finding moves to the resolved archive only after verification and a recorded root cause. Patch existence alone is not resolution evidence.

## Context engineering

Repository knowledge is the system of record. Workers get a map, not a pasted manual. Use `.studio/context-map.json`; load the base rules, the zone guide and only the relevant ADR/spec/code. Do not bulk-load `docs/MANIFEST.jsonc` or `docs/CATALOG.md` unless the task explicitly needs them.

Task specs point to source files instead of reproducing their contents. This improves cache reuse and prevents stale duplicated rules. OpenCode worker sessions prune old tool output during compaction, so durable decisions must live in repo/Orca/task/finding state rather than an old transcript.

## Owner questions

Only the Producer talks to the Owner by default. Worker questions go to the Producer through Orca. The Producer answers technical questions from repository evidence and escalates only true owner decisions. A pending decision blocks only dependent DAG nodes. For a DAG-blocking Owner choice, create/resolve an Orca decision gate so the decision remains attached to the task rather than existing only in chat memory.

A review finding with disposition `OWNER_DECISION` follows the same gate: the finding records the evidence, while Orca records the blocked decision lifecycle.

## Verification

Use focused tests during implementation. Serialize heavy full gates through one slot. Never run several Storybook/Rust/full verification jobs concurrently on the same PC just because workers are parallel.

Acceptance evidence is exact: commands, exit codes, tests/results, diff and unresolved risk. "Looks good" is not evidence. A reviewer comment without repository/runtime evidence is not automatically a durable finding.

## Failure and retries

Classify failure before retrying:

- harness/tool delivery failure: repair delivery/readiness, then retry same model;
- missing context: improve the task/context map, then retry;
- semantic/model failure: one retry at most, then escalate or decompose;
- architectural ambiguity: owner gate or fresh architect/reviewer, not repeated generation.

After three failed dispatches for one logical task, stop and replan rather than looping.

## Integration

Merge/integrate by dependency order and conflict surface, not completion timestamp. Read risky diffs before integration. Run the full gate on the integrated candidate, not once per trivial card. Preserve branch/PR and human-review rules in `AGENTS.md`.

For a finding batch, resolve individual finding IDs only after the integrated candidate passes their required verification. Keep unrelated open findings in the ledger; do not close an entire cluster by association.

## OpenCode harness defaults

The project OpenCode config intentionally disables nested subagents and conversation sharing, enables automatic compaction with old tool-output pruning, and ignores large generated directories in its watcher. These settings make each worker a bounded executor and reduce context/noise without changing the authoritative project.

## Metrics

For each dispatch retain: model/profile, zone, risk, weighted work, wall time, retries, verification time, review findings, rework and accepted outcome. For findings retain recurrence, time-to-resolution, reopened classes and prevention type. Optimize accepted weighted work per cost/usage after rework—not raw tokens or raw task count.
