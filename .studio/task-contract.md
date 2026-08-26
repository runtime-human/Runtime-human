# Studio task contract

Every dispatched task should be small enough to have a clear acceptance boundary but large enough to amortize repository/context startup cost. Prefer a batch of related work in one architecture zone over one worker per issue or one worker per review finding.

## Required task fields

```text
Task: <stable short id/title>
Objective: <observable outcome>
Zone: <core|persistence|content|application|ui|qa-performance|canon>
Risk: <R1|R2|R2_COMPLEX|R3>
Model profile: <profile key from .studio/models.json>
Depends on: <task ids or none>
Owner decision: <none|decision id>
Finding cluster: <none|cluster key + finding ids>

Must read:
- exact paths only

Boundaries:
- files/packages allowed to change
- contracts that must not change

Acceptance:
- objective, testable criteria
- for finding batches, which finding IDs must be resolved

Verification:
- focused commands first
- full gate only when assigned

Forbidden:
- scope expansion
- unrelated refactor
- bypassing failing tests
- changing canon without explicit task
```

## Task envelope

For diff-scoped batches the Producer (or a worker) can generate a machine-readable scope instead of re-deriving it:

```bash
pnpm studio:task -- --id RH-123 --diff origin/main --json
pnpm studio:task -- --id RH-124 --task-file <spec.txt>
```

The envelope is written to `.studio/runtime/tasks/<id>/envelope.json` (`runtime-human-task-envelope-v1`) and contains: zones/primary zone, risk, matching active skills, budgeted `mustRead`/`mayRead`, `allowedWrite`/`forbiddenWrite` globs, up to 3 relevant historical findings, warnings and tier verification commands. It is derived from git diff + `.studio/zones.json` + context-map + skill-map + finding ledger. The envelope does not replace this contract: Task/Objective/Acceptance fields remain authoritative and are supplied by the Producer.

## Worker completion

Return a compact handoff:

```text
DONE|BLOCKED|FAILED

Changed: <paths or count + important paths>
Acceptance: <passed/failed per criterion>
Verification: <command -> exit code/result>
Authority impact: <none|describe>
Migration/content-ID impact: <none|describe>
Finding IDs addressed: <none|ids; do not self-resolve>
Risks: <remaining risks or none>
Question: <none|single blocking question>
```

When running under Orca orchestration, send exactly one `worker_done` with the same facts. Do not duplicate the task spec back to the Producer.

A worker may state that a finding appears fixed, but only the Producer resolves the durable finding after independent/required verification.

## Reviewer handoff

Reviewers use `.studio/finding-contract.md`. They emit structured candidate findings plus acceptance supported/not-supported/uncertain. They remain read-only; the Producer owns disposition and ledger writes.
