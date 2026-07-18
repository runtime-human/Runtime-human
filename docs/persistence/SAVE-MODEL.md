# Модель сохранения

Нормативные решения:

- [ADR-005 — Suspended MonthRun](../adr/ADR-005-suspended-month-run.md);
- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

## 1. Consistency boundary

`SaveGameState` — consistency boundary завершённого месяца.

Commit/rollback together:

- provider/project/career outcome;
- minimal project/career state delta;
- `ExperienceEpisode` when eligible;
- professional state/result delta;
- finance/life consequences;
- important append-only history.

## 2. Authoritative structure

```text
current normalized snapshot
+ bounded append-only histories
+ pending MonthRun draft
+ committed-run markers/traces
+ rolling backups
+ rebuildable projections
```

Full event sourcing is not used.

## 3. Profile-aware schema rule

Persistence stores only fields required by implemented gameplay profile.

- Phase 1/2 MVP Casual has minimal project/professional state and empty CareerState.
- Phase 3 Career Slice adds only search/hiring/offer/position/trust fields used by gameplay.
- Recommended/Extended add tables/columns through migrations.
- Empty future ledgers are not created.
- Architecture seams are documented contracts, not preallocated schema.

## 4. Save metadata

- save ID/display name;
- game date/MonthIndex;
- save schema version;
- active project/professional/career schema versions only when implemented;
- rules/content fingerprints;
- Determinism Manifest;
- committed revision/last run;
- recovery/backup metadata;
- canonical checksum.

Metadata does not list schema versions for unimplemented systems.

## 5. MVP normalized snapshot

Authoritative before Career Slice:

- character/life state;
- minimal professional state;
- people/relationships needed by current content;
- active commitments/activities;
- minimal projects and Work Packages;
- three project quality bands;
- debt/risk/known issue band;
- compact release state;
- inventory/equipment/housing;
- finance;
- world/city/timeline;
- narrative state;
- achievements/lifecycle;
- empty/minimal CareerState.

Not required before Career Slice:

- career opportunity/search/hiring/offer tables;
- project component/requirement tables;
- debt ledger;
- defect inventory;
- maintenance pressure;
- participant plans;
- detailed evidence claims/indexes;
- company/portfolio/team/payroll tables;
- incident/rollback history.

## 6. MVP logical project storage

```text
projects
work_packages
project_quality
project_releases
project_history
```

Possible minimal fields:

### `projects`

- ID;
- stage;
- goal snapshot;
- debt/risk bands;
- known issue snapshot;
- release state;
- revision.

### `work_packages`

- ID/project ID;
- objective snapshot;
- state/progress/challenge/uncertainty/forecast;
- pending decision;
- outcome;
- revision.

### `project_quality`

- functional;
- usability;
- maintainability;
- optional situational payload.

### `project_releases`

- immutable compact release record.

Physical implementation may use versioned payload columns where practical.

## 7. Recommended/Extended project migrations

Add only with feature:

- optional/deferred scope;
- significant debt records;
- known defects/incidents;
- team contribution;
- detailed release history;
- maintenance;
- components/requirements;
- portfolio.

Each migration documents current gameplay consumer and rollback/recovery.

## 8. Professional storage

MVP snapshot:

- two aptitude values;
- active skill mastery/fluency;
- active technology familiarity;
- professional focus;
- awarded grade list.

MVP append-only:

- aggregated meaningful professional result;
- routine monthly practice aggregate;
- awarded grade when applicable;
- migration/repair record.

Detailed claims, context diversity and evidence browser indexes are added later if used.

## 9. Career Slice storage

Add only when Phase 3 begins.

### Normalized snapshot

```text
career_state
career_search_campaign
career_hiring_processes
career_offers
career_position
career_workplace_trust
```

Logical minimal fields:

### `career_state`

- schema version;
- active intent;
- active search/process/position refs;
- revision.

### `career_search_campaign`

- stable ID;
- intent;
- status/start date;
- surfaced opportunity snapshot IDs;
- aggregate routine search summary;
- generation/content fingerprint;
- revision.

### `career_hiring_processes`

- stable ID/opportunity ref;
- status/current stage;
- saved candidate-signal snapshot;
- saved visible employer projection/reasons;
- committed decision IDs;
- manifest/fingerprint;
- revision.

### `career_offers`

- stable ID/process/employer/role refs;
- title/expected scope;
- compensation/schedule/location proposal refs;
- visible/uncertain condition snapshots;
- expiry/probation;
- offer fingerprint;
- status/revision.

### `career_position`

- stable ID/employer/role/title;
- expected scope;
- start/end/status;
- compensation/schedule commitment refs;
- employment-context snapshot;
- revision.

### `career_workplace_trust`

- position ref;
- delivery/autonomy/quality/collaboration bands;
- growth trajectory;
- allowed scope;
- bounded reason history;
- revision.

Career storage does not duplicate:

- mastery/evidence/grade;
- ProjectState;
- Company teams/payroll/budget/portfolio;
- NPC relationships;
- life capacity;
- finance ledger;
- derived exact role-fit/hire probabilities.

## 10. Career append-only history

Preserve only meaningful records:

- surfaced/selected opportunity when it affected history;
- hiring outcome and primary reason;
- accepted/expired/declined offer;
- employment start/end;
- significant workplace scope/trust change;
- promotion/lateral/exit/layoff/re-entry transition.

Routine applications, ordinary rejection, routine work and salary payments aggregate or remain in their owning histories.

## 11. Append-only history

MVP preserves:

- important project milestones;
- compact release records;
- important scope/quality/debt choices;
- meaningful professional outcomes;
- grade awards;
- life milestones;
- migration/repair history.

Career Slice additionally preserves semantic career history from section 10.

Minor routine progress is aggregated and not stored as one record per day/action/application.

## 12. Derived/rebuildable

- readiness status/profile;
- specialization;
- capability cards;
- project card/forecast;
- market competitiveness summary;
- employer role-fit explanation;
- opportunity ranking/comparison badges;
- promotion readiness explanation;
- grouped history;
- monthly reports;
- search/thumbnail caches.

Advanced dashboards/indexes are created only when feature exists.

## 13. Pending MonthRun draft

Draft stores exact state needed to resume without reroll.

MVP project draft:

- project/package revisions and pre-state hashes;
- allocated work;
- provisional package progress;
- deterministic hidden realization;
- uncertainty/pending decision;
- provisional compact project outcome;
- provisional quality/debt/risk/release change;
- project trace/fingerprint.

MVP professional draft:

- episode ID/snapshot;
- provisional mastery/fluency/familiarity delta;
- aggregated professional result ID;
- progression trace/fingerprint.

Career Slice draft, only for active career gameplay:

- career/search/process/offer/position revisions and pre-state hashes;
- selected Career Intent;
- surfaced opportunity snapshots;
- visible and uncertain condition snapshots;
- candidate signal snapshot;
- hiring stage/template/version;
- selected portfolio story/approach;
- shared challenge/learning outcome refs;
- deterministic complication/employer projection;
- provisional hiring outcome/offer;
- workplace expectation/outcome/trust/transition proposal;
- RNG states/manifest/fingerprints;
- decision/answer history.

No draft fields for unimplemented Company, detailed labor market, contract or performance ledgers.

## 14. Revision and idempotency

- save revision increments once per successful commit;
- project/package/career/process/offer/draft use revisions;
- mutating commands carry request ID/expected revision;
- conflicts do not overwrite silently;
- committed run marker prevents duplicate month;
- deterministic project/episode/result/release/opportunity/process/offer/transition IDs prevent duplicate records;
- duplicate salary/position transition rejected through owner/idempotency contracts;
- crash after commit resolves through committed marker.

## 15. Backups

Backup includes implemented snapshots/histories, schema/rules/content metadata and active draft according to policy.

Rebuildable caches optional.

Recommended slots:

- current autosave;
- rolling previous revisions;
- manual;
- pre-migration/pre-update;
- read-only import preview.

## 16. Integrity on open

Checks only implemented systems:

1. file/envelope/SQLite/pragmas;
2. implemented schema versions;
3. stable references;
4. rules/content compatibility;
5. Determinism Manifest;
6. active draft/committed marker;
7. package state validity;
8. hidden realization checksum;
9. release immutability;
10. duplicate IDs;
11. professional/project/career cross-invariants;
12. active opportunity/process/offer snapshot consistency;
13. no duplicate salary/offer/transition;
14. recovery flags.

Do not fail open because absent Extended tables were never implemented.

## 17. Rust write protocol

Rust persistence service performs:

- DTO validation;
- revision/idempotency checks;
- explicit transaction;
- checked conversion;
- snapshot/history consistency;
- unique constraints;
- commit/rollback/error mapping.

Rust does not calculate project, progression, opportunity, interview, workplace trust or promotion outcome.

Renderer has no raw SQL execute capability.

## 18. Compatibility

New version must not silently:

- continue incompatible active draft/package/process/offer;
- reroll hidden project/opportunity/interview/offer/transition outcome;
- change numeric/RNG/phase rules;
- rewrite release/grade/career transition history;
- duplicate outcome/salary/offer during schema expansion;
- discard semantic snapshots;
- convert popularity/title/salary/tenure/referral into technical progression;
- convert employer cancellation/layoff into candidate performance failure.

Adding Recommended/Extended fields requires migration only when the feature enters implementation.

If migration impossible: exact-compatible version, Safe Mode, read-only export or backup restore.

## 19. Career migration sequence

When Career Slice enters implementation:

1. add empty CareerState migration for existing saves;
2. add Career schema/content/rules fingerprints;
3. add minimal normalized career tables/payloads;
4. add append-only career transition history;
5. add draft support for active search/hiring/offer/workplace decision;
6. add integrity/recovery checks;
7. validate pre-career save load and rollback;
8. do not create Company/HR tables.

## 20. Invariants

- storage matches active profile;
- no speculative empty schemas beyond minimal top-level empty state;
- project/progression/career/life/economy commit atomically when one decision touches them;
- routine history bounded;
- meaningful history readable after content changes;
- projections rebuildable;
- hidden/project/career outcome restart-safe;
- no duplicate offer/salary/position/transition;
- grade/title/position/trust remain separate in storage;
- Extended migration cost considered before feature approval.
