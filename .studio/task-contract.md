# Studio task contract

Every dispatched task should be small enough to have a clear acceptance boundary but large enough to amortize repository/context startup cost. Prefer a batch of related work in one architecture zone over one worker per issue.

## Required task fields

```text
Task: <stable short id/title>
Objective: <observable outcome>
Zone: <core|persistence|content|application|ui|qa-performance|canon>
Risk: <R1|R2|R2_COMPLEX|R3>
Model profile: <profile key from .studio/models.json>
Depends on: <task ids or none>
Owner decision: <none|decision id>

Must read:
- exact paths only

Boundaries:
- files/packages allowed to change
- contracts that must not change

Acceptance:
- objective, testable criteria

Verification:
- focused commands first
- full gate only when assigned

Forbidden:
- scope expansion
- unrelated refactor
- bypassing failing tests
- changing canon without explicit task
```

## Worker completion

Return a compact handoff:

```text
DONE|BLOCKED|FAILED

Changed: <paths or count + important paths>
Acceptance: <passed/failed per criterion>
Verification: <command -> exit code/result>
Authority impact: <none|describe>
Migration/content-ID impact: <none|describe>
Risks: <remaining risks or none>
Question: <none|single blocking question>
```

When running under Orca orchestration, send exactly one `worker_done` with the same facts. Do not duplicate the task spec back to the Producer.
