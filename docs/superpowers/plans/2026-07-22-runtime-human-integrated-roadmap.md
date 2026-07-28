---
title: "Runtime Human integrated implementation roadmap"
type: plan
status: superseded
superseded_by: docs/plans/ROADMAP.md
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-28
---

# Runtime Human integrated implementation roadmap

## Purpose

This roadmap starts from the actual repository state after the deterministic MonthRun protocol and the first production implementation of the SQLite durable store. It includes unfinished PR #18 work and the next product milestones required for the first playable January 1990 vertical slice.

The plan intentionally combines:

- current Runtime Human canon and code;
- SQLite, rusqlite, rusqlite_migration and Tauri official contracts;
- architecture patterns studied in GitButler, Yaak, Silvermine and Tauri plugins;
- crash-testing practices from SQLite-compatible engines;
- social simulation ideas from Neighborly, Comme il Faut/Prom Week, Wildermyth, storylets and Generative Agents;
- the project's existing deterministic RNG, canonical JSON, content compilation and Narrative Director decisions.

Implementation remains independent. External repositories are design references; Runtime Human owns its contracts and code.

---

# 1. Current verified baseline

## Merged

- deterministic runtime kernel;
- canonical authoritative JSON;
- Xoshiro256** RNG with serializable state and scoped forks;
- crash-safe MonthRun checkpoint protocol;
- pure exhaustive reducer;
- durable-boundary runner;
- request/revision/hash contracts;
- self-hosted read-only Windows verification workflow.

## PR #18 implemented and compiling before Tauri integration

- exact TypeScript persistence DTOs and parsers;
- shared TypeScript/Rust fixture;
- rusqlite 0.40.1 with bundled SQLite;
- rusqlite_migration 2.6.0;
- typed Rust trust boundary and safe IPC errors;
- internal checkpoint fingerprint verification;
- STRICT migration v1 and migration manifest hash;
- WAL, synchronous FULL, foreign keys, busy timeout and defensive configuration;
- writable/read-only database open paths;
- one bounded single-owner database worker;
- save create/load;
- MonthRun begin/load/active-load;
- revision + payload hash + internal checkpoint hash CAS;
- durable request receipts;
- compact durable-boundary journal;
- atomic completed-to-committed save update;
- clean-shutdown marker and basic recovery classification.

## Added in the current continuation

- Tauri managed persistence state;
- typed async Tauri commands using spawn_blocking;
- application-owned database path;
- controlled worker shutdown on application exit;
- platform-independent game-application persistence invoke port and service.

---

# 2. PR #18 remaining work

## P18-01 — Compile and stabilize Tauri boundary

### Files

- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/src/persistence/commands.rs`
- `apps/desktop/src-tauri/src/persistence/mod.rs`
- `packages/game-application/src/persistence-port.ts`
- `packages/game-application/src/persistence-service.ts`

### Required result

- all commands compile under Tauri 2.11.5;
- managed state type exactly matches command `State` type;
- no synchronous SQLite work executes on the async runtime thread;
- shutdown is idempotent;
- no command exposes paths, SQL or generic JSON patches;
- public results remain closed versioned unions.

### Verification

- full `pnpm verify`;
- command-name mapping test with fake invoke port;
- desktop Rust compile on Windows;
- launch/exit smoke test when UI automation is available.

## P18-02 — Verified Online Backup API

### Production behavior

Add `persistence_create_backup_v1`.

The worker owns backup serialization. The renderer supplies only request ID and save ID. The destination is selected inside:

```text
<AppData>/backups/
```

Protocol:

1. validate command and receipt;
2. verify requested save exists;
3. allocate an application-owned backup ID and file name;
4. create destination with exclusive create semantics;
5. use `rusqlite::backup::Backup`, never raw file copy;
6. run incrementally with bounded page batches;
7. close destination;
8. reopen destination read-only;
9. verify schema version, migration manifest, quick_check and foreign_key_check;
10. verify requested save and active MonthRun presence;
11. persist a receipt only after verification;
12. delete a failed incomplete destination where safe;
13. return redacted metadata, not an absolute path.

### Additional schema decision

Do not add a backup table in migration v1 merely to track files. For the first implementation, backup metadata is derived from the verified file and returned through the receipt. Add durable backup catalog metadata only when restore UI exists.

### Tests

- backup contains save and active run;
- backup does not block future writes after completion;
- existing destination is never overwritten;
- failed backup is not reported as accepted;
- duplicate request returns the same metadata;
- destination passes read-only open and integrity checks.

## P18-03 — Expanded recovery validation

Basic clean-shutdown classification already exists. Expand unclean startup to validate application invariants:

- all active checkpoint payload hashes;
- all active internal checkpoint fingerprints;
- compatibility payload hashes;
- journal tail equals current run durable checkpoint;
- receipt result hashes for relevant active operations;
- committed run points to the exact committed save revision;
- no save references an absent last committed run;
- one-active-run partial index remains valid.

Classification:

```text
healthy
unclean-but-valid
newer-schema-read-only
migration-history-mismatch
corrupted
backup-available
```

Rules:

- never rewrite a corrupt row silently;
- never replace primary database automatically;
- newer schema is incompatibility, not corruption;
- mutation commands reject while recovery-required;
- read-only export remains possible when integrity allows.

## P18-04 — Backup-before-migration

Before migrating a non-empty older supported schema:

1. open old schema writable but do not mutate application rows;
2. create verified pre-migration snapshot;
3. apply all pending migrations atomically;
4. verify manifest, quick_check and foreign keys;
5. reopen current schema;
6. retain backup until a successful post-migration reopen.

Migration v1 does not need this path for a new database, but the reusable mechanism must exist before migration v2 is introduced.

## P18-05 — Response parsers

Outgoing command parsers exist. Add exact response parsers to `game-persistence-contracts`:

- safe error parser;
- save record parser;
- MonthRun record parser;
- recovery status parser;
- backup metadata parser;
- mutation/query union parsers.

The application service must parse responses after `invoke`, not trust TypeScript generics as runtime validation.

## P18-06 — Focused application adapter tests

Use a fake invoke port to verify:

- exact command name;
- exact argument key (`command` or `query`);
- outgoing parser invocation;
- response parser invocation;
- request ID is unchanged on retry;
- unknown result kind is rejected;
- platform package remains absent from `game-application` dependencies.

## P18-07 — Crash-boundary harness

Do not rely on panic because Rust drops may roll back normally. Use a child process and immediate termination.

Failpoints:

```text
before_begin_immediate
after_receipt_lookup
after_save_insert
after_run_insert
after_checkpoint_cas
after_journal_insert
after_save_cas
after_run_committed
after_receipt_insert
before_commit
after_commit_before_reply
```

For every point:

1. parent prepares a file-backed fixture database;
2. child executes one operation and terminates at the failpoint;
3. parent reopens;
4. quick_check and foreign_key_check succeed;
5. operation is either fully absent or fully committed;
6. retry with the same request ID is safe;
7. no save revision increments twice;
8. journal and current checkpoint agree.

Implement project-owned failpoints first. Add a failpoint crate only if the small enum/harness becomes harder to maintain.

## P18-08 — Adversarial audit

Review every mutation for:

- receipt lookup and insertion inside the same immediate transaction;
- no nested transaction creation;
- exact affected-row checks;
- revision and both checkpoint hashes in CAS;
- terminal state transition restrictions;
- internal checkpoint fingerprint recomputation;
- no authoritative wall-clock use;
- no unbounded queue or response;
- no SQL/path/payload leakage in IPC errors;
- safe worker panic/disconnect behavior;
- shutdown marker correctness;
- read-only open does not mutate;
- backup never copies a live WAL database as a lone file.

## P18-09 — Documentation and merge gate

- update design to match final implemented names;
- mark completed tasks in the PR plan;
- add bundled SQLite runtime version to PR evidence;
- regenerate docs catalog and manifest;
- run the full trusted Windows workflow;
- request final automated review;
- resolve all Critical/Important findings;
- squash merge using expected head SHA.

---

# 3. PR #19 — First persisted MonthRun application slice

PR #18 provides storage primitives. PR #19 connects the pure MonthRun orchestration to those primitives without UI scope expansion.

## P19-01 — Persistence orchestration actor

Create an application service that owns:

```text
create/load save
begin MonthRun
run pure core until durable boundary
persist boundary
accept decision through pure reducer
continue until next boundary
commit completed run
recover active run after restart
```

It must preserve one request ID across an IPC retry and must never rerun RNG after receiving a duplicate receipt.

## P19-02 — Save bootstrap

Define the smallest `SaveStateV1` required for January 1990:

- stable save ID;
- revision;
- game date/month;
- deterministic root seed/state;
- player core profile;
- unlocked content fingerprint;
- minimal active NPC references;
- completed milestone references.

No company, product or broad career schema until used by the first month.

## P19-03 — Restart recovery flow

On application start:

1. get recovery status;
2. load selected save;
3. load active MonthRun;
4. verify compatibility against current content/rules fingerprints;
5. if ready/suspended/completed, reconstruct application view;
6. never automatically abandon or commit;
7. present typed recovery action when required.

## P19-04 — End-to-end first month contract test

File-backed integration scenario:

```text
create save
begin month
run to suspended decision
close database
reopen
load decision
accept answer
run to completed
close/reopen
commit
close/reopen
verify save revision and committed run
retry every mutating request
```

---

# 4. PR #20 — Content compiler foundation

## Architecture

```text
JSONC source
→ exact schema validation
→ stable ID/reference validation
→ chronology validation
→ semantic validation
→ bounded materialization
→ immutable compiled registries
→ content fingerprint
```

## Libraries

- JSON Schema 2020-12;
- Ajv standalone validators at build/tool time only;
- `jsonc-parser` in tools only;
- existing canonical JSON and SHA-256 implementation;
- Vite lazy chunks by historical era when content size warrants it.

## Required validators

- duplicate stable IDs;
- dangling references;
- chronology and era availability;
- unreachable storylets/events;
- contradictory requirements/effects;
- unbounded candidate expansion;
- semantic near-duplicates through normalized signatures;
- deterministic compilation and fingerprint reproduction.

## Exclusions

- executable JavaScript content;
- general-purpose runtime DSL;
- runtime YAML/JSONC parsing;
- runtime Ajv;
- LLM-generated authoritative events;
- unrestricted Cartesian materialization.

---

# 5. PR #21 — Determinism hardening

Keep the existing Xoshiro256** implementation. Do not replace it with PCG.

Add:

- official/reference vectors;
- Node/WebView parity;
- Rust parity only where Rust needs to verify shared fixtures;
- golden serialized RNG states;
- call-count traces for MonthRun phases;
- lint/boundary prohibition of `Math.random()` in game core;
- scoped forks:
  - `month/content`;
  - `month/narrative`;
  - `month/npc`;
  - `month/outcome`;
  - `npc/<personId>`.

The root stream must not change because an unrelated narrative candidate was added.

---

# 6. PR #22 — NPC state and directed relationships

## Three simulation tiers

### Active

Full compact state for the handful of people currently affecting the player.

### Background

Compressed state updated only when an event references the person.

### Archived

Stable identity, major relationship facts, milestones and return hooks only.

## Person state

```ts
type PersonStateV1 = Readonly<{
  id: PersonId;
  archetypeId: PersonArchetypeId;
  tier: "active" | "background" | "archived";
  ageBand: AgeBand;
  organizationId?: OrganizationId;
  roleId: RoleId;
  availability: AvailabilityBand;
  traits: readonly TraitId[];
  hooks: readonly NarrativeHookId[];
  currentGoals: readonly GoalId[];
  relationshipIds: readonly RelationshipId[];
  memorySummary: NpcMemorySummary;
}>;
```

## Directed relationship state

```ts
type RelationshipStateV1 = Readonly<{
  fromPersonId: PersonId;
  toPersonId: PersonId;
  warmth: Score;
  personalTrust: Score;
  professionalTrust: Score;
  respect: Score;
  conflict: Score;
  obligation: Score;
  familiarity: Score;
}>;
```

No universal good/bad relationship scalar. Direction matters.

## MVP limits

- 3–5 stable traits;
- up to 2 temporary states;
- 1–3 current goals;
- 2–4 narrative hooks;
- bounded relationship dimensions;
- no daily schedule, inventory, pathfinding, embeddings or prompt history.

---

# 7. PR #23 — Typed NPC memory and beliefs

## Memory facts

```ts
type NpcMemoryFactV1 = Readonly<{
  id: MemoryFactId;
  personId: PersonId;
  kind: MemoryKind;
  subjectId?: PersonId;
  sourceEventId: EventId;
  occurredAt: GameDate;
  salience: Score;
  emotionalSign: -1 | 0 | 1;
  strength: Score;
  expiresAt?: GameDate;
  tags: readonly MemoryTag[];
}>;
```

## Retrieval score

Integer/fixed-point only:

```text
salience
+ current-context relevance
+ relationship relevance
+ unresolved-hook bonus
+ bounded recency modifier
- duplicate-summary penalty
```

## Compaction

Deterministically combine repeated minor facts into typed summaries. Preserve source IDs and do not use natural-language reflection or embeddings.

## Beliefs

NPC beliefs may differ from world truth:

```ts
type NpcBeliefV1 = Readonly<{
  subjectId: PersonId;
  kind: BeliefKind;
  value: BeliefBand;
  confidence: Score;
  sourceMemoryIds: readonly MemoryFactId[];
}>;
```

Belief updates are explicit effects. No hidden inference outside a reviewed system.

---

# 8. PR #24 — Utility social actions

NPCs do not run continuous behavior trees. At an event/month boundary, build a small eligible action set:

```text
offer-hint
offer-explanation
offer-pair-work
decline-help
delegate-task
request-revision
praise
criticize
recommend
avoid
reconcile
```

Score:

```text
base utility
+ role relevance
+ goal relevance
+ trait modifier
+ directed relationship modifier
+ retrieved memory modifier
+ obligation modifier
+ context pressure
- availability cost
- repetition penalty
```

Selection order:

```text
score descending
→ declared priority
→ stable action ID
→ scoped RNG only on an exact tie
```

Every selection produces an auditable trace with contributing terms.

---

# 9. PR #25 — Social storylets and Narrative Director integration

## Storylet contract

```ts
type SocialStoryletDefinitionV1 = Readonly<{
  id: StoryletId;
  participantRoles: readonly ParticipantRole[];
  requirements: readonly Requirement[];
  scoringModifiers: readonly ScoringModifier[];
  choices: readonly StoryletChoice[];
  effects: readonly TypedEffectProposal[];
  memoryOutputs: readonly MemoryFactTemplate[];
  cooldownMonths: number;
  antiRepeatKey: string;
}>;
```

Storylets propose typed effects; domain providers apply them. Storylets never mutate state directly.

## Narrative Director responsibility

The Event Engine determines eligibility and effects. The Director selects which eligible event appears now.

Add scoring for:

- unresolved relationship hook;
- professional trust relevance;
- memory continuation;
- role relevance;
- participant recency penalty;
- same-NPC streak penalty;
- unresolved-arc overload;
- programmer-gameplay priority.

Director cannot make an ineligible event legal or change its mechanical effects.

---

# 10. PR #26 — January 1990 content

## Active NPCs

### Guardian

- computer access;
- household constraints;
- spending attitude;
- support/control axis;
- first values conflict.

### Mentor/teacher

- feedback;
- guided explanation;
- obsolete but sometimes useful advice;
- professional trust precursor.

### Peer

- competition;
- shared experimentation;
- exchange of materials;
- social motivation;
- assisted evidence distinct from solo capability.

## Initial storylets

```text
computer-access
ask-for-help
shared-experiment
conflicting-advice
first-program-feedback
family-cost-discussion
peer-competition
mentor-recommendation
```

Keep 2–5 background NPCs without full simulation.

---

# 11. PR #27 — Balance and simulation harness

Run thousands of deterministic months across controlled seeds.

Measure:

- NPC appearance distribution;
- repeated category and participant streaks;
- mentor dependency rate;
- solo vs assisted capability evidence;
- relationship farming dominance;
- permanent soft locks;
- memory count and compaction rate;
- active/background/archive population;
- candidate set sizes;
- MonthRun duration;
- save/checkpoint payload size;
- deterministic replay divergence.

Guardrails:

- no NPC dominates more than the configured share of optional events;
- bad relationships do not permanently block programmer progression;
- assistance cannot produce solo capability evidence;
- background NPC memory remains bounded;
- identical seed/choices/content fingerprint produce identical history;
- NPC content cannot displace mandatory programmer gameplay indefinitely.

---

# 12. PR #28 — First playable UI

Only after the persisted vertical slice is stable:

- save selection/create screen;
- month planning screen;
- MonthRun progress view;
- suspended decision presentation;
- recovery banner/actions;
- completed month summary;
- committed save confirmation;
- NPC relationship and memory explanations only where player-facing;
- diagnostic export entry point.

UI never owns authoritative transitions. It dispatches application commands and renders typed results.

---

# 13. Cross-cutting quality gates

## Architecture

- game core remains pure;
- application orchestrates;
- Rust persists and validates storage invariants;
- renderer has no SQL/filesystem authority;
- no generic workflow or ORM layer;
- no runtime LLM.

## Determinism

- safe integers/fixed point;
- canonical JSON;
- versioned fingerprints;
- scoped RNG;
- stable sorting/tie-breaking;
- golden fixtures and replay tests.

## Persistence

- one writer;
- bounded queue;
- immediate transactions;
- WAL + FULL;
- exact receipt replay;
- dual checkpoint integrity levels;
- atomic final commit;
- verified backup;
- explicit recovery.

## Content

- build-time validation;
- immutable compiled registries;
- stable IDs and chronology;
- deterministic fingerprints;
- bounded materialization.

## NPC

- small number of active actors;
- directed relationships;
- typed bounded memory;
- explicit beliefs;
- event-triggered utility actions;
- storylets and Director selection;
- no continuous city simulation.

---

# 14. Immediate execution order

1. Run full verification for the new Tauri/application boundary.
2. Fix only factual compile/lint/test failures.
3. Add response parsers and adapter tests.
4. Implement Online Backup API through the worker.
5. Expand application-level recovery validation.
6. Add file-backed reopen and backup tests.
7. Add targeted child-process crash tests for create/store/commit.
8. Perform adversarial persistence review.
9. Update PR #18 evidence and merge after final green gate.
10. Start PR #19 from the merged main and implement the persisted MonthRun orchestration slice.
11. Proceed through content compiler, determinism hardening and NPC phases in the order above.

Do not start broad NPC/content implementation inside PR #18. The persistence PR must remain reviewable and mergeable as a self-contained durable-store change.
