---
title: "ENGINE-02C Desktop Scenario Delivery Design"
type: plan
status: accepted
canon: true
updated: 2026-09-05
---

# ENGINE-02C Desktop Scenario Delivery Design

## Status

Approved continuation of #158 Stage A.

## Goal

Make the merged certified January `ScenarioArtifactV1` consumable by the real desktop bootstrap through an explicit opt-in scenario runtime mode, while keeping the existing legacy January runtime as the default authority.

## Architecture

The artifact is produced at repository/build time from the already committed January scenario source, capability registry and execution policy using the existing compiler/resolver/certifier primitives. Browser code never compiles authoring JSON and never depends on `@runtime-human/game-devtools`.

The generated artifact is published as a static desktop asset. Desktop owns only transport: fetch bytes, parse JSON, and hand the value to the application/core January scenario validator. `createJanuary1990ScenarioRuntime(...)` remains the execution boundary and re-validates program, capability, certificate and fingerprint identity fail-closed.

`createDesktopJanuarySession(...)` gains an explicit runtime selector:

```ts
type DesktopJanuaryRuntimeMode = "legacy" | "scenario";
```

The selector defaults to `"legacy"`. Scenario mode loads the certified artifact before constructing the runtime. No default authority cutover occurs in Stage A.

## Safety constraints

- No browser-side compiler/certifier.
- No desktop runtime dependency on `@runtime-human/game-devtools`.
- No `tools/**` deep import from application/browser code.
- No new checkpoint, save, persistence, recovery or transaction protocol.
- No generic scenario VM/interpreter.
- The generated artifact must be deterministic and staleness-checked by a permanent repository command included in `check:fast`.
- Malformed/missing artifact must fail before MonthRun begin/resume mutation.
- Existing legacy desktop behavior remains the default.

## Migration boundary

Legacy and scenario runtimes intentionally use different compatibility/rules fingerprints. Therefore changing the default runtime for a save with an active legacy MonthRun would produce an incompatible-checkpoint result. Stage A does not perform that switch.

Stage B will select authority based on whether an active run already exists and which compatibility identity it carries: active legacy runs continue under legacy authority; fresh/no-active-run sessions may start under scenario authority. Legacy execution is not removed until this policy is proven.

## Verification

Stage A requires:

- deterministic artifact build/check tests;
- static asset loader success and malformed/missing failures;
- legacy mode remains the default;
- explicit scenario mode constructs scenario compatibility and uses existing persisted MonthRun behavior;
- failure occurs before MonthRun mutation for an invalid artifact;
- real desktop bootstrap/session regression coverage;
- exact-head fast feedback and canonical V3 evidence.

Refs #158, #156, #105.
