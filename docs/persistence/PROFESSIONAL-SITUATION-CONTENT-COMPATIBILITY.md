# Professional Situation Content — Persistence & Compatibility

## Статус

Нормативная compatibility-спецификация.

Связанные документы:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-007 — Determinism Manifest](../adr/ADR-007-determinism-manifest.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-016 — Professional Challenge](../adr/ADR-016-authoritative-professional-challenge-model.md);
- [ADR-020 — Professional Situation Composition](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Save Compatibility](SAVE-COMPATIBILITY.md).

## 1. Цель

Обеспечить, что content update, component rename/removal или compiler-rules change:

- не reroll уже показанную ситуацию;
- не переписывают committed history;
- не создают duplicate outcome/effects/ExperienceEpisode;
- не требуют хранить весь content catalog в save;
- дают контролируемый recovery при несовместимом active draft.

## 2. Authoritative и compiled данные

### Compiled/rebuildable

Не хранятся как mutable save truth:

- authoring kernels/context frames/pressure packages;
- composition constraints;
- complete materialized registry;
- coverage reports;
- duplicate clusters;
- Content Studio diagnostics;
- future eligibility candidates;
- Narrative Director ranking.

Они поставляются compiled content package и идентифицируются fingerprints.

### Persisted active snapshot

Когда ситуация стала visible/pending, MonthRun draft сохраняет:

```ts
type ActiveProfessionalSituationSnapshot = Readonly<{
  situationId: TechnicalSituationId;
  compiledVariantId: CompiledSituationVariantId;
  compiledVariantVersion: ContentVersion;
  compositionSetId: SituationCompositionSetId;
  kernelId: SituationKernelId;
  contextFrameId: SituationContextFrameId;
  pressurePackageId: SituationPressurePackageId;
  consequenceBridgeId: SituationConsequenceBridgeId;
  presentationPackId: SituationPresentationPackId;
  semanticSnapshot: ProfessionalSituationSemanticSnapshot;
  presentationSnapshot: ProfessionalSituationPresentationSnapshot;
  providerContractSnapshot: ProviderSituationContractSnapshot;
  availableApproaches: readonly ProfessionalApproachOptionSnapshot[];
  realizedComplication?: ChallengeComplicationSnapshot;
  contextFingerprint: ContextFingerprint;
  contentFingerprint: ContentFingerprint;
  rulesVersion: RulesVersion;
  providerRevision: ProviderRevision;
}>;
```

Snapshot содержит только данные, необходимые exact resume и explanation.

### Persisted provisional result

После выбора до commit:

```ts
type ProvisionalProfessionalSituationResult = Readonly<{
  situationId: TechnicalSituationId;
  selectedApproachId: ProfessionalApproachId;
  challengeOutcome: ProfessionalChallengeOutcomeSnapshot;
  providerEffectProposals: readonly ProviderEffectProposalSnapshot[];
  episodeFacts: ExperienceEpisodeFactsSnapshot;
  followUpProposals: readonly ProfessionalFollowUpProposalSnapshot[];
  explanation: ProfessionalSituationExplanationSnapshot;
  traceHash: TraceHash;
}>;
```

### Committed history

После atomic commit сохраняется semantic history через provider/Challenge/Progression histories:

- provider/source snapshot;
- goal/dilemma/causes;
- available and selected approach semantics;
- outcome/compromise/assistance;
- provider change;
- episode facts/evidence result where eligible;
- follow-up/recovery hook;
- rules/content fingerprints.

Committed history не требует исходных authoring components для чтения.

## 3. Fingerprints

Разделяются:

- component source fingerprint;
- composition-set fingerprint;
- compiled variant fingerprint;
- semantic fingerprint;
- presentation/localization fingerprint;
- provider contract fingerprint;
- challenge rules fingerprint;
- registry/catalog fingerprint.

Presentation-only update может не менять semantic fingerprint, но меняет content/presentation version for future materialization.

## 4. Stable IDs

Generated `CompiledSituationVariantId` выводится из:

```text
stable namespace
+ composition set ID/version
+ kernel ID/version
+ context frame ID/version
+ pressure package ID/version
+ bridge ID/version
+ presentation pack ID/version
+ compiler rules version
```

Rules:

- canonical field order;
- stable-ID sorting;
- no display/localized text;
- no filesystem/object insertion order;
- no random UUID at compile time;
- no wall clock;
- no model/prompt output hash without reviewed content version.

## 5. Content update matrix

### Add new component/variant

- future registry gains variant;
- active/committed state unchanged;
- eligibility may expose it only in future MonthRun;
- coverage snapshots update intentionally.

### Change presentation only

- new future presentation version;
- active visible snapshot keeps old copy to prevent player-facing mutation;
- committed history keeps semantic/result snapshot;
- old presentation may have tombstone for replay/debug.

### Change semantic kernel/approaches

- create new component/content version;
- old active snapshot resumes old semantics;
- old committed history unchanged;
- future eligibility uses new variant;
- automatic in-place semantic replacement forbidden.

### Change provider bridge

- new bridge version;
- provisional result with old bridge keeps old proposals and requires original provider revision validation;
- if application cannot safely proceed, recovery/abandon draft path is required;
- committed provider result unchanged.

### Remove component

- component ID becomes tombstone;
- materialized variants using it stop appearing in future eligibility;
- active snapshot can resume from embedded semantic/provider snapshot where safe;
- committed history remains readable;
- no ID reuse.

### Change compiler rules

- compiler rules version changes;
- registry/fingerprints rebuilt;
- golden snapshots reviewed;
- active visible snapshot does not rematerialize;
- future variants may receive new IDs if semantic composition changed.

## 6. Resume policy

On loading suspended MonthRun:

1. validate save/schema version;
2. validate active snapshot integrity/hash;
3. check provider/source existence and revision;
4. check required effect handler/contract support;
5. prefer exact compiled variant if available;
6. otherwise use embedded semantic/presentation snapshot;
7. never reroll complication/approaches;
8. never re-run Director selection;
9. never silently map selected approach to a new semantic intent.

## 7. Recovery modes

### Exact resume

All referenced versions/handlers available. Continue unchanged.

### Snapshot resume

Compiled definition removed, but embedded snapshot and provider contract remain executable. Continue with original visible situation.

### Controlled mapping

Allowed only when explicit migration states:

- old/new semantic intent equivalence;
- provider bridge compatibility;
- unchanged player-visible meaning;
- reviewed mapping version.

Mapping cannot alter selected approach or improve/worsen outcome.

### Abandon active decision

When safe application is impossible:

- abandon only uncommitted MonthRun draft;
- restore last committed month boundary;
- append recovery/diagnostic record;
- do not penalize character;
- offer export/backup.

### Safe Mode/read-only

Used when content/handlers are unavailable or integrity fails. Preserve committed history and allow diagnostic export.

## 8. Atomicity and idempotency

One stable `SituationResolutionId`/idempotency key guards:

- answer submission;
- Challenge outcome creation;
- provider effect proposal;
- provider application;
- ExperienceEpisode creation;
- follow-up/Event hook creation;
- monthly report entry.

Duplicate resume/command returns existing result or explicit conflict. It never creates a second outcome.

## 9. Event and Narrative compatibility

Event-wrapped situation snapshot additionally preserves:

- EventDefinition ID/version;
- arc/stage/hook identity;
- participant IDs/roles;
- Director selection trace reference;
- blocking budget context where needed for diagnostics.

Content update must not:

- replace persistent participant silently;
- skip required chain stage;
- convert professional event into unrelated variant;
- reselect candidate after reload;
- reset semantic repetition through new presentation ID.

## 10. Repetition history compatibility

Save/history stores semantic anti-repeat keys or rebuildable semantic snapshots sufficient to reconstruct:

- exact variant recency;
- kernel/dilemma recency;
- approach-shape recency;
- cause/consequence/provider/archetype recency;
- presentation-only group.

If taxonomy evolves:

- old keys remain tombstoned/recognized;
- explicit mapping may aggregate old/new analytics;
- active and committed outcomes are not reclassified for progression;
- analytics migration is separate from gameplay history.

## 11. Mod compatibility

Mod situation content:

- uses namespaced stable IDs;
- declares compiler/API compatibility;
- ships all required components/localization;
- passes same validation/budgets;
- cannot depend on runtime network/LLM;
- cannot overwrite vanilla IDs;
- provides tombstones/migration for IDs used in active saves.

Removing a mod with active situation triggers snapshot resume if safe, otherwise abandon draft/Safe Mode. Committed history remains readable through semantic snapshots.

## 12. Migration profile

No speculative top-level `ProfessionalSituationContentState` is added to `SaveGameState` merely because ADR-020 exists.

Implementation adds only:

- active snapshot fields required by MonthRun;
- provisional result fields;
- semantic anti-repeat history required by Director;
- content fingerprints/tombstones required for compatibility.

Coverage/diagnostics/corpus registries remain compiled artifacts.

## 13. Verification fixtures

1. Exact resume same registry.
2. Presentation changed after decision visible.
3. Kernel changed/new version.
4. Bridge handler unavailable.
5. Compiled variant removed but snapshot executable.
6. Component tombstoned.
7. Mod removed with active situation.
8. Duplicate answer after crash.
9. Provider revision mismatch.
10. Director registry changed after selection.
11. Compiler rules version changed.
12. Old repetition key mapping.
13. Committed history opens without original content.
14. Safe Mode export.
15. Input order changed but stable ID unchanged.

## 14. Definition of Done

Compatibility layer is complete for implemented scope when:

- active visible decision resumes exactly;
- no complication/approach/outcome reroll;
- duplicate command is idempotent;
- committed history independent of live definitions;
- content removal has tombstone/recovery;
- compiler/version changes have reviewed snapshot diff;
- presentation update cannot alter semantics;
- provider mismatch cannot silently apply effects;
- repetition metadata survives updates;
- no unused future state is reserved.
