---
title: "Technology Context Persistence & Compatibility"
type: engine
status: draft
canon: true
depends_on: [ADR-010, ADR-019]
updated: 2026-07-18
---

# Technology Context Persistence & Compatibility

Нормативные источники:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md)
- [ADR-019 — Historical Technology & Ecosystem](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Save Model](SAVE-MODEL.md)
- [Save Compatibility](SAVE-COMPATIBILITY.md)

## Цель

Зафиксировать restart/update/history guarantees для technology context без предварительного создания полного technology/ecosystem schema в save.

## Profile rule

До появления playable technology context save хранит только уже существующую professional familiarity и owner state. Architecture contract не создаёт пустые tables/fields.

Когда feature реализован, migration добавляет только данные, необходимые текущему gameplay.

## Authoritative versus compiled

### Compiled/rebuildable

- Historical Technology Catalog;
- source registry;
- technology/family/band definitions;
- ecosystem profiles/evidence;
- fictional local availability definitions;
- compatibility/migration graph;
- current read-model projections.

### Authoritative owner state

- character familiarity in ProfessionalState;
- equipment/installed/access state in corresponding owners;
- active project technology reference/snapshot where outcome depends on it;
- active MonthRun context snapshot/fingerprint;
- committed project/release/episode semantic technology snapshot;
- migration/repair history.

## Active context snapshot

```ts
type ActiveTechnologyContextRecord = Readonly<{
  snapshot: TechnologyContextSnapshot;
  providerKind: ExperienceProviderKind;
  providerSourceId: StableId;
  ownerRevisions: TechnologyContextOwnerRevisions;
  rulesVersion: TechnologyContextRulesVersion;
  contentFingerprint: TechnologyContentFingerprint;
  decisionHistory: readonly DecisionAnswerRecord[];
}>;
```

Stored only when needed for resume/no-reroll.

## Checkpoint policy

Persist:

- before technology-informed blocking choice;
- after materializing context/eligible options;
- after accepted answer before later provider phases;
- before completed → committed when technology context affects outcome/history.

UI inspection and Details do not create new context or consume RNG.

## Deterministic identifiers

Examples:

```text
TechnologyContextSnapshotId = hash(saveId, monthRunId, providerSourceId, technologyId, bandId, contextOrdinal, rulesVersion)
TechnologyChoiceId = hash(snapshotId, choiceHookId)
TechnologyHistorySnapshotId = hash(providerOutcomeId, snapshotId)
```

Duplicate begin/resume/answer returns prior state or conflict; it never creates a second context/outcome/familiarity delta.

## Atomic commit

When technology context affects a provider outcome, one transaction commits:

- owner domain outcome;
- required project/career/learning state delta;
- semantic technology context snapshot/reference;
- `ExperienceEpisode`;
- Progression delta/result;
- finance/life/access owner consequences where applicable;
- stable history/trace;
- save revision/committed-run marker;
- draft cleanup.

Technology context and provider/progression consequences cannot commit independently when cross-invariants depend on them.

## Semantic fingerprint dimensions

Separate fingerprints:

- technology identity/family/band;
- support/lifecycle semantics;
- compatibility/migration graph;
- ecosystem profile/evidence mapping;
- fictional local availability;
- provider context template;
- context projection rules;
- trait salience rules;
- localization-only.

Cosmetic localization can rebuild views. Semantic fingerprint change may block active resume.

## Compatibility cases

### Historical-only reference removed

Use tombstone/semantic snapshot. Normal writable open allowed if no active dependency.

### Active technology definition missing

Writable resume blocked. Recovery:

- restore exact content;
- controlled replacement mapping;
- abandon active draft;
- Safe Mode/read-only export.

### Version band changed/removed

Requires exact-compatible mapping or controlled migration with golden fixture. Never silently map based only on display name/version number.

### Support policy corrected

Committed project/release history retains original semantic snapshot. Current projections may use corrected catalog. Active attempt requires compatibility decision based on whether support status affects pending outcome.

### Ecosystem evidence updated

Raw source/evidence change may rebuild current projections. It cannot rewrite committed outcomes/evidence. Active context remains frozen or requires controlled migration if semantic traits changed.

### Fictional local diffusion rebalanced

Future availability/projections may change by versioned content. Already committed access/use history remains readable. Active context cannot reroll.

### Compatibility graph changed

Active project/migration requires exact preservation or explicit recovery/migration. Completed releases retain their compatibility snapshot.

### Source invalidated

Mark source/claim review status. Do not delete history. A repair record may update current catalog and explain correction without rewriting past player decisions.

## Save migrations

Migration must document:

- gameplay consumer;
- old/new schema and semantic mapping;
- active-draft policy;
- history/tombstone handling;
- rollback/backup;
- golden fixtures;
- source/content/rules fingerprints;
- no familiarity/evidence duplication.

No migration is created merely because ADR-019 documents future fields.

## Familiarity compatibility

`TechnologyProficiencyState` preserves technology identity/family and familiarity history. Version-band detail is added only when gameplay needs it.

Catalog change cannot:

- grant target familiarity;
- erase familiarity because support ended;
- convert old familiarity into current-band readiness;
- create production evidence;
- demote Professional Grade.

Current familiarity/readiness projections may account for band/ecosystem shift and recency.

## Committed semantic snapshot

A project/release/episode record stores only player-relevant context:

- technology identity/family;
- meaningful band;
- platform/toolchain profile;
- relevant support/compatibility/ecosystem traits;
- local/access route where causally relevant;
- source/local basis snapshot;
- rules/content versions and trace.

It does not preserve full catalog or raw survey dataset.

## Recovery UX

Normal recovery explains:

- which active context is incompatible;
- whether only current attempt or whole save is affected;
- available exact/migration/abandon/read-only options;
- that committed history remains preserved.

No internal hash dump in Normal mode.

## Required tests

1. close before context choice;
2. close after materialization;
3. duplicate answer/resume;
4. localization-only update;
5. semantic band/support change;
6. compatibility graph change;
7. ecosystem evidence update;
8. local diffusion rebalance;
9. missing historical-only definition/tombstone;
10. missing active definition/recovery;
11. catalog correction after committed release;
12. no duplicated familiarity/evidence;
13. exact snapshot IDs after replay;
14. future-version/read-only export;
15. backup/restore with active context.

## Invariants

- save stores only implemented authoritative data;
- active context is immutable/restart-safe;
- provider/context/progression cross-effects commit atomically;
- catalog/source updates do not rewrite committed history;
- exact semantic compatibility, not display names, controls resume;
- familiarity/evidence/grade are not derived from catalog migration;
- tombstones preserve historical readability;
- no dynamic web data is required to open/play a save;
- incompatible state has safe recovery/export path.