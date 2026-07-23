---
title: "Runtime Human execution status and next gates"
type: plan
status: active
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-22
---

# Runtime Human execution status and next gates

Status snapshot: **23 July 2026**. Machine-readable companion: [`../../EXECUTION-STATUS.jsonc`](../../EXECUTION-STATUS.jsonc).

This ledger records implementation state. Accepted ADRs and specialized specifications remain authoritative for design invariants.

## Completed foundation milestones

| Stable work ID | GitHub evidence | State |
|---|---|---|
| `FOUNDATION-01` | PR #15, `63df5b5` | complete |
| `DETERMINISM-01` | PR #16, `7521ff6` | complete |
| `MONTHRUN-01` | PR #17, `66d9ecb` | complete |
| `PERSISTENCE-01` | PR #18, `c41e531` | complete |

PR #18 delivered the direct `rusqlite` store, one-worker ownership, bounded commands, WAL + `synchronous=FULL`, dual-hash CAS, durable receipts, atomic final commit, verified backup, recovery read-only modes, typed Tauri commands and TypeScript persistence service. Its implementation is merged; older unchecked pre-merge checklist items are historical, not remaining work.

## Active work — `MR-ORCH-01`

GitHub: **draft PR #20**, branch `agent/persisted-month-run-orchestration`.

Goal: connect the pure MonthRun kernel to the durable SQLite commands without moving gameplay authority into Rust.

Required production behavior:

1. recovery preflight before gameplay or mutation;
2. load save and active MonthRun;
3. create a ready checkpoint only when no run exists;
4. persist ready state before deterministic execution;
5. advance ready/running states only in the pure core;
6. persist every suspended/completed/exceptional boundary by revision + payload SHA + internal checkpoint hash CAS;
7. preserve the outer request ID across retry and derive stable bounded receipt IDs for internal persistence operations;
8. restore an unchanged suspended decision after restart;
9. commit a completed run atomically exactly once;
10. block corruption, newer schema and incompatible checkpoints before invoking gameplay steps.

Closed application results:

```text
idle
waiting-decision
committed
terminal
blocked
rejected
```

Acceptance matrix:

- no active run → `idle`;
- ready → continue to the next durable boundary;
- suspended → expose the identical pending decision without rerunning steps;
- completed → commit once;
- acknowledgement lost after begin/boundary/commit → retry with durable-receipt equivalence;
- corrupted/read-only/incompatible → no gameplay step and no mutation;
- after commit, a later startup sees updated save and no active run.

## Next stable work IDs

| Work ID | Scope | State |
|---|---|---|
| `CONTENT-01` | deterministic compiled content foundation | planned |
| `DETERMINISM-02` | cross-runtime determinism hardening | planned |
| `NPC-01` | minimal person state and directed relationships | planned, gated by playable need |
| `NPC-02` | typed memory and beliefs | deferred until playtest evidence |
| `NPC-03` | utility social actions | deferred until playtest evidence |
| `NPC-04` | storylets and Narrative Director integration | planned in minimal vertical-slice form |
| `JAN-01` | January 1990 authored content | planned |
| `JAN-02` | deterministic multi-seed balance simulation | planned |
| `JAN-03` | desktop first-playable vertical slice | planned |

Future work uses stable IDs in plans. GitHub PR numbers are recorded only after a PR actually exists; closed PR #19 remains the historical CI experiment and is not reused as an implementation identifier.

## Global merge gate

- one active implementation PR until the first playable slice;
- branch starts from current `main`;
- no arbitrary renderer SQL;
- no nondeterministic time/randomness in authoritative state;
- no runtime LLM authority;
- no merge without resolved Critical/Important findings;
- final self-hosted Windows `foundation` workflow must pass on the unchanged reviewed head.

The self-hosted runner is intentionally unavailable until the evening of 23 July 2026. Draft PR #20 must remain unmerged and not ready-for-review until that authoritative gate can run.
