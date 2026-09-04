# ENGINE-02 Stage F Runtime Adapter Design

## Goal

Connect a verified `ScenarioProgramV1` to the existing MonthRun execution protocol without introducing a second runtime, persistence, recovery, or RNG authority.

## Architectural decision

Stage F is a **linear compiled-scenario adapter** over the existing `MonthRunStep[]` contract.

`runUntilBoundary`, `transitionMonthRun`, persisted checkpoints, request-id deduplication, suspend/resume, commit, and recovery remain authoritative. The adapter only translates verified compiled instructions into deterministic MonthRun steps.

The first supported execution profile is intentionally narrow:

- `entryPc === 0`;
- `decision`, `provider`, `random-content`, `complete` only;
- every non-terminal instruction advances to the immediately following scenario PC;
- `gate` and `branch` are rejected;
- no arbitrary PC jump support;
- no content-provided code or generic expression language.

The adapter prepends MonthRun's existing implicit `start` step. Therefore scenario PC `n` maps to MonthRun `programCounter = n + 1`.

## Typed runtime bindings

Compiled IR intentionally does not contain domain prompts or domain mutation logic. Runtime semantics are supplied by trusted code-owned bindings, not authoring JSON.

Bindings are separated by instruction kind:

- decision binding -> `suspend-for-decision` event;
- provider binding -> `advance-step | materialize-outcome` event;
- random-content binding -> `materialize-outcome` event;
- complete binding -> `complete` event.

Bindings are keyed by the prevalidated identities carried by the compiled program tables. Missing or duplicate bindings fail closed before execution.

January bindings reuse the existing January domain functions; Stage F must not duplicate January rules or RNG logic.

## Verified artifact contract

The adapter accepts the already separated versioned artifacts:

- `ScenarioProgramV1`;
- `ScenarioResolvedCapabilitiesV1`;
- `ScenarioCertificateV1`.

It validates before producing steps:

- capability `programFingerprint` equals program fingerprint;
- certificate `programFingerprint` equals program fingerprint;
- certificate is `bounded === true` and `completionGuaranteed === true`;
- certificate transition budget covers the instruction count;
- provider table/descriptor identities remain aligned;
- the program satisfies the linear Stage F profile.

## Compatibility and resume safety

No checkpoint schema v2 is introduced.

A versioned composite execution fingerprint is derived from:

- existing January/domain rules fingerprint;
- scenario `programFingerprint`;
- capability `rulesFingerprint`;
- certificate `policyFingerprint`;
- certificate `certificateFingerprint`.

The composite becomes `MonthRunCompatibilityV1.rulesFingerprint` for the scenario-backed runtime. Existing MonthRun compatibility checks therefore fail closed on program/rules/policy/certificate drift during restore/resume.

The legacy January runtime keeps its existing compatibility fingerprint and remains authoritative until controlled equivalence evidence is green.

## January controlled runtime

Add a separate January scenario-backed runtime factory. Do not switch the existing `createJanuary1990Runtime` default in this slice.

The scenario-backed factory:

1. builds the existing January content context and plan;
2. loads/builds the verified January compiled artifacts from code-owned constants/builders, not filesystem runtime reads;
3. creates January typed bindings that reuse existing January domain step semantics;
4. creates adapter-produced `MonthRunStep[]`;
5. creates composite scenario execution compatibility;
6. delegates persistence and orchestration to `createPersistedMonthRunOrchestrator` unchanged.

## Required proof

TDD must prove:

- linear program maps to implicit-start + deterministic MonthRun steps;
- decision suspension uses the existing MonthRun protocol;
- resume still uses request-id exactly-once semantics;
- restore rejects composite fingerprint mismatch;
- unsupported gate/branch/non-linear next PC fail closed before execution;
- missing typed binding fails closed;
- actual January transitions do not exceed certificate transition budget;
- actual January RNG consumption remains within the certified two-call bound;
- controlled January scenario-backed execution reaches the same decision sequence and terminal result as the existing hierarchical January runtime for the selected deterministic corpus;
- no persistence contract or checkpoint schema changes are required.

## Non-goals

- replacing `runUntilBoundary`;
- changing persistence records;
- checkpoint schema v2;
- arbitrary PC jumps;
- general branching runtime;
- provider scripting;
- generic state mutation APIs;
- changing the default January runtime;
- deleting the legacy January step table.
