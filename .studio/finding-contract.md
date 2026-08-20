# Review finding contract

Review findings are durable engineering evidence, not an instruction to fix every comment immediately. The independent reviewer stays read-only and returns structured candidates; the Producer validates/dispositions them and is the only normal writer of the ledger.

## Independent dimensions

- **Severity**: impact if the defect is real (`S0` catastrophic, `S1` critical, `S2` important, `S3` normal, `S4` polish).
- **Size**: expected agent work (`XS`, `S`, `M`, `L`, `XL`). This is not an estimate in human hours.
- **Scope**: blast radius (`local`, `zone`, `cross-zone`, `systemic`).

Never lower severity because the fix is large. Never inflate severity because the fix is expensive.

## Reviewer output

For every actionable finding, emit one block:

```text
FINDING
Summary: <one sentence>
Severity: <S0|S1|S2|S3|S4>
Size: <XS|S|M|L|XL>
Scope: <local|zone|cross-zone|systemic>
Zone: <Studio zone>
Category: <stable failure class>
Component: <stable subsystem/component>
Invariant: <violated invariant or none>
Evidence: <path:line/test/runtime evidence>
Suggested disposition: <BLOCK|FIX_NOW|LEDGER|OWNER_DECISION>
Reason: <why this is a defect and why the classification fits>
```

The reviewer does not write `.studio/findings/*` and does not edit product code.

## Producer disposition

Every validated candidate gets exactly one disposition:

- `BLOCK` — cannot accept the current change;
- `FIX_NOW` — bounded correction belongs in the current integration cycle;
- `LEDGER` — valid debt/bug retained for clustering and later batching;
- `DUPLICATE` — already represented by another finding class;
- `INVALID` — evidence does not support a defect;
- `ACCEPTED_RISK` — intentionally not fixed; archive with rationale outside the reviewer;
- `OWNER_DECISION` — product/architecture trade-off requires the Owner gate.

Only `BLOCK`, `FIX_NOW`, `LEDGER`, and `OWNER_DECISION` remain in the open ledger. Closed dispositions go directly to the resolved archive.

## Fingerprint

The normal fingerprint is derived from:

```text
zone:component:category:invariant
```

The same fingerprint is a recurring failure class. Re-detection increments `occurrences` and merges evidence instead of creating another bug row. Use an explicit fingerprint only when the derived identity would conflate materially different failures.

## Resolution

A finding is resolved only after the fix is verified. Resolution records a concise root cause, optional fix commit, and prevention applied. Recurring/systemic findings should normally leave behind at least one prevention mechanism: regression test, validator/mechanical guard, or a focused skill/context improvement.
