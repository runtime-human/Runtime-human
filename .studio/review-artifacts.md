# Review artifact lifecycle

Raw reviewer/tester reports are temporary evidence, not project memory. Durable knowledge belongs in repository canon, Orca task/decision state, PR evidence, `.studio/findings/ledger.jsonl`, or `.studio/findings/resolved.jsonl`.

## Location

Store raw reports under the ignored runtime tree:

```text
.studio/runtime/reviews/<run-id>/<task-id>/<round>-<profile>.<md|json>
```

Never commit raw review/test reports. If a tool emits `review.md`, `review.json`, `test-report.md`, or equivalent outside this tree, the Producer moves it into the task review directory before processing it.

## Producer lifecycle

1. **Ingest** — identify the task, review round, model/profile, base/head commits and acceptance criteria covered by the report.
2. **Validate** — check every candidate finding against the actual diff, canon and runtime/test evidence. Reviewer prose is evidence, not authority.
3. **Reconcile** — disposition each candidate. Durable valid defects go to the finding ledger; owner choices become Owner/Orca gates; invalid/duplicate comments are not preserved as durable bug rows.
4. **Fix** — dispatch coherent finding batches. Do not edit the raw report to pretend a finding disappeared.
5. **Post-fix test** — run the independent Luna xhigh tester using `studio:route --test` and collect fresh evidence.
6. **Post-fix review** — R1/R2/R2_COMPLEX use Luna xhigh review; R3 uses fresh Sol review. Use GLM-5.3 `--review --cross-family` when a finding is disputed, semantically ambiguous, or an independent model-family opinion is valuable.
7. **Resolve** — move verified finding IDs to the resolved ledger only with root cause and prevention evidence where required.
8. **Cleanup** — when every candidate/finding from the raw report is reconciled and no Owner decision, dispute, or harness investigation still needs the exact report, delete the raw report and empty task review directory.

## Retention exceptions

Keep a raw report temporarily only while at least one of these is true:

- an `OWNER_DECISION` is unresolved;
- the Producer and reviewer disagree and exact evidence is still under investigation;
- a harness/tool failure requires replay/debugging;
- the report contains evidence not yet copied into the durable finding/PR/Orca record.

Once the exception is resolved, reconcile the durable state and delete the raw report.

## What survives cleanup

Survives:

- finding fingerprint, severity, size, scope, occurrences and evidence references;
- root cause, fix commit and prevention on resolved findings;
- accepted Owner decisions in the appropriate canon/Orca state;
- verification commands/results required by the task/PR;
- systemic lessons promoted into tests, guards, skills or canon.

Does not survive by default:

- duplicated reviewer narrative;
- stale markdown checklists;
- intermediate model reasoning;
- superseded review rounds;
- screenshots/log dumps whose useful evidence has already been referenced or promoted to a required artifact location.

This keeps the Studio memory compact: reports are working material; validated findings and prevention are the durable memory.
