# Runtime Human AI-First Harness — Waves 9–14 Execution Plan

Date: 2026-08-31
Base: `main` @ `d2b8b39022ce80ef8fef1ac932e18d4cd8411f00`
Implementation branch: `feat/ai-first-harness-foundation`
Master blueprint: `.opencode/Runtime-Human-AI-First-Game-Development-Implementation-Plan-2026-08-24.md`

## Goal

Finish the remaining AI-first development harness without turning tooling into a second product. Every wave must leave the repository usable, preserve Runtime Human authority boundaries, and improve agent legibility, verification or authoring in a measurable way.

## Confirmed baseline

Waves 0–8 are already implemented on `main`:

- compact `AGENTS.md`, `GAME.md`, zone/context policy, skill registry and validation;
- Studio task envelope, historical-finding injection, compact exec, affected/verification helpers;
- minimal Nx adoption and local cache;
- Vitest projects and Storybook browser testing;
- Storybook MCP dev integration;
- `gamectl` v1, Game Catalog and structured diagnostics;
- TypeBox authoring-schema pilot;
- balance authoring layer and ruleset/balance fingerprints;
- deterministic simulation, fast-check properties, semantic fixtures, repro/replay/trace/explain and simulation compare.

Do not recreate these features. Extend them through their existing APIs.

## Global constraints

- `game-core` stays pure deterministic TypeScript: no React, Tauri, SQLite, filesystem, network or system clock.
- Persistence remains Rust-owned and single-writer; no Node tool opens the production SQLite database with independent semantics.
- Runtime never parses raw authoring JSONC/Ajv.
- Scenario data may describe topology but may not mutate authoritative state directly.
- Balance remains a closed typed data model; no formula strings, `eval`, Lua or generic gameplay DSL.
- GUI tools are projections over canonical text sources. Headless/library parity comes first.
- Generated artifacts are never hand-edited as source.
- Storybook/Authoring Studio remain development-only and receive no production Tauri capabilities.
- Model routing remains authoritative in `.studio/models.json`; skills may not copy or redefine model selection.
- R3 persistence/schema/determinism/security/release changes keep fresh independent testing/review and human gates.
- New dependencies are exact-pinned where repository policy requires it and must have a concrete first consumer.
- Each wave uses focused V0/V1 checks while editing, V2 before PR review, V3 only at the serialized merge-candidate gate, V4 only for release readiness.

---

# Wave 9 — Skills v2 and measurable evaluator planning

## Outcome

Agents automatically receive the domain skill that matches already-implemented balance/simulation/tooling capabilities, while evaluator cost policy becomes machine-readable and measurable without prematurely weakening review.

## 9.1 Activate only capabilities that exist

Create:

- `.agents/skills/runtime-balance/SKILL.md`
- `.agents/skills/runtime-simulation/SKILL.md`
- `.agents/skills/runtime-harness/SKILL.md`

Keep planned:

- `runtime-scenario` until Wave 10 scenario contracts/commands exist;
- `runtime-persistence` until Wave 14 read-only persistence inspection exists.

Update `.studio/skill-map.json` statuses and activation text.

### Skill responsibilities

`runtime-balance`:

- owns tuning-only changes under `balance/**`;
- starts with `pnpm balance:check` and existing `gamectl` simulation/explain evidence;
- escalates to `runtime-implement`/architecture when a request actually changes an algorithm or authoritative contract;
- forbids generic expression DSLs and derived values stored as editable constants.

`runtime-simulation`:

- owns simulation policies, fast-check properties, fixtures, repro/replay/trace/explain and report comparison;
- requires explicit deterministic seeds/policies;
- requires model/property tests to remain simpler than the implementation they validate;
- does not treat simulation as replacement for human game-feel/playtest judgement.

`runtime-harness`:

- owns `.studio`, Nx, `gamectl`, Storybook agent integration and repository developer tooling;
- requires proof that harness changes do not silently alter gameplay;
- requires structured output/versioning for machine-consumed CLI contracts;
- does not introduce a second orchestrator or arbitrary shell/file proxy.

## 9.2 Make task envelopes select active domain skills

Test first in a new tooling test file:

- balance zone resolves `runtime-balance`;
- simulation zone resolves `runtime-simulation`;
- tooling zone resolves `runtime-harness`;
- planned scenario still falls back to `runtime-implement`;
- R3 always prepends `runtime-architecture` while keeping the active domain skill.

Then update `ZONE_SKILLS` in `scripts/studio/context-lib.mjs`.

Acceptance:

- task envelopes choose the smallest matching active set;
- no worker needs to read every skill body;
- no planned skill is selected before its commands/contracts exist.

## 9.3 Add evaluator planner in shadow mode

Create `scripts/studio/evaluator-plan.mjs` and root script `studio:evaluate`.

Input:

```text
pnpm studio:evaluate -- --change-class <id> --risk <R1|R2|R2_COMPLEX|R3> [--json]
```

Behavior:

- read `.studio/verification-policy.json`;
- validate `changeClass` and risk;
- never allow requested risk below class minimum;
- resolve evaluator profile keys to `.studio/models.json` without copying model names into policy;
- output deterministic `runtime-human-evaluator-plan-v1` containing effective risk, deterministic gate, tester/reviewer/cross-family disposition, profile keys and `mode`;
- initial mode is `shadow`: output recommendations only, never authorize skipping an evaluator by itself;
- R3 always retains tester + R3 reviewer regardless of sampling fields;
- classes listed under `neverWeakenReviewFor` cannot be represented as sampled/optional-only review.

Test first:

1. `docs-generated-only` returns no tester, sampled reviewer, `mode=shadow`;
2. `gameplay` returns Luna tester + Luna reviewer profile keys;
3. `persistence-schema-determinism` promotes requested R2 to effective R3 and returns tester + R3 reviewer;
4. unknown class exits 2;
5. unknown risk exits 2;
6. output contains profile keys, not duplicated concrete model names;
7. no configuration path can remove mandatory R3 evaluator pair.

## 9.4 Refresh stale operational guidance

Update without changing product canon:

- `AGENTS.md`: activate balance/simulation/harness skills; keep scenario/persistence planned; Storybook MCP is implemented, development-only, not “planned”.
- `docs/agents/README.md`: add active balance/simulation/harness routing using existing docs (`BALANCE-LAYER`, `GAMECTL`, `AI-FIRST-GAME-DEVELOPMENT`) rather than creating redundant guides in this wave.
- `.studio/verification-policy.json`: mark implemented simulation/Nx tooling as current; add `adaptiveReview.mode = "shadow"`; document activation criteria for later enforcement.

## 9.5 Wave 9 verification

Focused:

```text
pnpm studio:skills:check
pnpm studio:check
pnpm exec vitest run --project tooling-node tests/studio-skill-routing.test.ts tests/studio-evaluator-policy.test.ts
```

Candidate:

```text
pnpm studio:verify -- --tier V2
```

Do not claim completion until CI confirms the branch/PR against current GitHub runner state.

---

# Wave 10 — Scenario v1 in shadow mode

## Outcome

Introduce a typed, analyzable scenario topology without replacing the authoritative January MonthRun executor.

## 10.1 Scenario schema

Add `ScenarioManifestV1` to `packages/game-authoring-schema` with a closed node set:

```text
decision
provider
random-content
gate
branch
complete
```

Required fields:

- `schemaVersion`;
- stable scenario `id`;
- `entry` node id;
- node map;
- typed next/branch targets;
- provider/predicate/content-pool identifiers where applicable.

Explicitly forbidden:

- arbitrary expressions;
- state mutation payloads;
- scripts;
- executable formula strings.

## 10.2 Scenario analyzer

Add reusable analyzer in `game-devtools` with stable diagnostics:

```text
SCN001 unreachable-node
SCN002 dead-end
SCN003 missing-target
SCN004 duplicate-or-invalid-id
SCN005 unbounded-cycle
SCN006 invalid-provider-reference
SCN007 invalid-predicate-reference
SCN008 missing-fallback
```

Analyzer is pure and deterministic.

## 10.3 January shadow manifest

Create `content/1990s/programming/scenarios/january-1990-first-program.jsonc` that describes the existing sequence only.

Do not modify MonthRun execution to consume this manifest yet.

Add equivalence tests asserting the manifest topology represents the same ordered boundaries and terminal path as the current January implementation.

If equivalence requires duplicating authoritative effect semantics, stop; keep scenario manifests for future slices only.

## 10.4 gamectl scenario commands

Add read-only:

```text
gamectl scenario validate [<id>]
gamectl scenario show <id>
```

Use existing versioned gamectl envelope and diagnostics.

## 10.5 Activate runtime-scenario

Only after commands/tests are green:

- create `.agents/skills/runtime-scenario/SKILL.md`;
- set skill-map entry active;
- map scenario zone to the skill;
- update AGENTS/docs routing.

## 10.6 Verification

- schema accept/reject parity;
- analyzer unit tests for every SCN code;
- January equivalence golden;
- `gamectl scenario validate --json` contract test;
- `content:check`, `balance:check`, affected core tests remain unchanged.

---

# Wave 11 — Secure Authoring Studio shell

## Outcome

A development-only React/Vite app can inspect and make bounded exact edits to canonical authoring files through the same validators used by CLI/compiler.

## 11.1 Start read-first

Create `apps/authoring` using workspace React/Vite versions.

First screen set:

- Catalog;
- Entity details/source path;
- validation diagnostics;
- read-only diff preview.

No React Flow/charts yet.

## 11.2 Bounded local authoring server

Bind only `127.0.0.1`.

Expose semantic operations rather than arbitrary filesystem access:

```text
readEntity(id)
validateEntity(id)
updateJsoncValue(entityId, jsonPointer, value)
previewDiff(entityId, pendingEdit)
```

Allow roots only for approved canonical authoring directories. Explicitly deny `.git`, `.github`, `.studio` policy, secrets, release/signing and arbitrary shell execution.

## 11.3 JSONC exact-write contract

Use the existing `jsonc-parser` modify/apply-edits path so one field edit yields a minimal diff and preserves comments/formatting.

Write flow:

```text
read canonical source
→ apply one semantic edit in memory
→ validate resulting document
→ produce diff preview
→ atomic write after explicit action
```

## 11.4 JSON Forms

Add JSON Forms only after secure read/write round-trip works.

Generate ordinary controls from the same JSON Schema. Add custom renderers only for meaningful domain types such as stable IDs, references, months, probabilities and fixed-point values.

## 11.5 Acceptance

Editing one balance/content field in UI produces the same canonical result and validation outcome as direct CLI/compiler use, with no separate domain implementation in the app.

---

# Wave 12 — Scenario Graph and Balance Lab

## Outcome

Human-facing visual projections over already-proven headless scenario/balance/simulation APIs.

## 12.1 React Flow scenario projection

Add `@xyflow/react` only now.

Canonical gameplay data remains scenario JSONC. Visual coordinates live separately in `*.layout.json` and are non-authoritative.

Graph shows:

- node type;
- stable id;
- outgoing edges;
- analyzer diagnostics;
- referenced provider/predicate/content ids.

## 12.2 Balance Lab

Show editable tuning plus derived evidence:

- current value;
- derived min/max;
- fixed-seed distribution summaries;
- baseline/candidate compare;
- warnings for dominance/regression.

UI calls `game-devtools`/simulation libraries; it does not reimplement formulas.

## 12.3 Fixture and replay views

Add fixture explorer and replay/trace inspector only over existing closed parsers.

## 12.4 Acceptance

Library parity tests prove GUI and CLI call the same domain functions. Deleting all layout files must not change gameplay fingerprints.

---

# Wave 13 — DTCG design-token source + Terrazzo

## Outcome

Move existing CSS design constants to a standards-based, agent-readable token source with reproducible generated CSS and no visual change in the migration PR.

## 13.1 Pilot subset

Move only:

- game surfaces/colors;
- spacing;
- radii.

Use DTCG 2025.10-compatible token JSON and Terrazzo build/check.

Generated output must preserve current CSS variable semantics exactly.

## 13.2 Expand after proof

Then migrate typography, motion and fixed shell dimensions.

Keep migration aliases until all consumers move. Remove aliases only in a later clean-up PR with visual regression evidence.

## 13.3 Verification

- deterministic generated output;
- Storybook browser tests;
- selected screenshot baselines;
- zero deliberate visual change in source migration PR.

---

# Wave 14 — Read-only Persistence Inspector and Dev Overlay

## Outcome

Turn runtime failures into semantic evidence/repro artifacts without raw SQLite spelunking or a second persistence implementation.

## 14.1 Rust-owned inspection boundary

Design a read-only typed inspection API in the Rust persistence boundary. It reuses production parsing/integrity/recovery semantics and returns bounded summaries.

No arbitrary SQL endpoint.

## 14.2 gamectl save commands

After the Rust boundary exists, add:

```text
gamectl save inspect
gamectl save verify
gamectl save diff
gamectl save export-repro
```

Migration/repair remains a separate R3/human-gated capability and is not part of ordinary agent tooling.

## 14.3 runtime-persistence skill

Only now create/activate `runtime-persistence` and route persistence tasks through it.

## 14.4 Desktop dev overlay

Compile-time/dev-only overlay shows bounded structured state:

- current screen/route;
- save revision;
- MonthRun stage/program counter;
- pending decision;
- ruleset/content fingerprints;
- recent reason codes/explanation trace;
- persistence health summary;
- performance spans.

Allowed action: export repro. No arbitrary authoritative mutation.

## 14.5 Acceptance

A real runtime failure can be exported to a portable repro and replayed headlessly without manual database inspection. Release build contains no privileged authoring/debug capability.

---

# Parallelization and PR order

Use `maxWorkers=3` only across independent authority boundaries.

Recommended sequence:

```text
PR-J   Wave 9 skills + shadow evaluator planner
PR-K   Wave 10 scenario v1 shadow/analyzer
PR-L   Wave 11 Authoring Studio secure shell/forms
PR-M   Wave 12 scenario graph + balance lab
PR-N   Wave 13 DTCG/Terrazzo token migration
PR-O   Wave 14 persistence inspector + dev overlay
```

Safe parallel work after PR-K contracts settle:

```text
A: Authoring Studio shell/security
B: DTCG token migration pilot
C: scenario/balance visual projections design/tests
```

Never concurrently mutate mutually dependent `game-schema`, compiler public contracts, January authoritative rule contracts or persistence schema from independent workers.

# Stop/go criteria

Stop a wave instead of expanding scope when:

- a GUI needs a second copy of domain semantics;
- a scenario manifest needs direct state mutation to model existing gameplay;
- a skill must reference commands that do not exist yet;
- a cache/affected optimization cannot prove correctness against representative changes;
- adaptive evaluation reduces calls but increases escaped S0/S1/S2 findings or repeated failure classes;
- a new dependency has no immediate first consumer;
- authoring/debug tooling requires production capabilities.

# Completion metrics

Track per accepted task where available:

```text
context bytes
files opened
commands
tool/cache hits
implementation attempts
tester/reviewer calls
review rounds
wall time
input/output/cached tokens
finding count
scope violations
```

The harness is successful only if accepted-task cost falls without increasing escaped regressions, severe findings, scope violations, save/determinism incompatibilities or visual/gameplay quality regressions.
