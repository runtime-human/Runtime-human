---
title: "Совместимость сохранений"
type: engine
status: draft
canon: true
depends_on: [ADR-010, ADR-013, ADR-014, ADR-018]
updated: 2026-07-18
---

# Совместимость сохранений

Нормативные решения:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

## Compatibility dimensions

Independent dimensions:

- save/database schema;
- project/work-package/release schema;
- professional/evidence schema;
- career opportunity/search/hiring/offer/position/trust schema when implemented;
- game/project/progression/career rules;
- project/professional/career projection versions;
- content API;
- exact/compatible content/mod fingerprint;
- active MonthRun provider fingerprints;
- Determinism Manifest/RNG algorithms.

Projection mismatch may rebuild cache without blocking open. Authoritative semantic mismatch requires migration or recovery.

## Open policy

- `compatible` — normal writable open;
- `compatible-rebuild-projections` — rebuild project/readiness/career read models;
- `requires-migration` — backup + authoritative migration;
- `missing-content-historical-only` — use snapshots/tombstones;
- `missing-content-active` — block writable open until recovery;
- `future-version` — read-only metadata/export;
- `incompatible-draft` — active MonthRun recovery flow;
- `project-history-damaged` — Safe Mode/read-only/restore;
- `professional-history-damaged` — Safe Mode/read-only/restore;
- `career-history-damaged` — Safe Mode/read-only/restore.

## Semantic fingerprints

Project fingerprint includes definitions affecting active technical outcome.

Professional fingerprint includes episode/skill/technology/evidence/grade rules.

Career fingerprint, when Phase 3 exists, includes:

- labor-market profile semantics;
- fictional employer/role/opportunity definitions;
- requirement classification;
- search surfacing rules;
- hiring stage/outcome/reason rules;
- offer condition semantics;
- employment-context and workplace-trust rules;
- transition reason/promotion rules;
- owner-integration contracts.

Cosmetic localization does not break semantic fingerprint. Localization changes that alter semantic option meaning require content review/versioning.

## Rules changes

New version required for changes to:

- WorkPackage lifecycle/outcome;
- progress/uncertainty/RNG;
- quality/debt/defect/release/contribution semantics;
- skill/evidence/grade semantics;
- MonthRun owner phase order;
- Career requirement/signal projection semantics;
- opportunity generation/surfacing;
- hiring outcome/offer rules;
- workplace trust/allowed-scope semantics;
- promotion/transition cause semantics.

Completed months, releases, awarded grades and committed career transitions do not recalculate.

Project/professional/career projections may rebuild when their authoritative inputs and semantics remain compatible.

## Historical record compatibility

Committed records keep:

- semantic snapshot;
- rules/content versions;
- trace/source hashes;
- stable IDs.

This applies to:

- releases/incidents/major project decisions;
- meaningful professional results/grade awards;
- selected opportunities and hiring outcomes that changed history;
- accepted/ended positions;
- significant trust/scope change;
- promotion/lateral/exit/layoff/re-entry transitions.

New code cannot silently change past technical result, evidence, employer cause, offer terms or transition reason.

Corruption correction requires explicit repair record and backup.

## Active project compatibility

Active package stores deterministic hidden realization and RNG/checksum.

Writable resume forbidden when technical outcome semantics, IDs, required active content or pre-state hashes cannot be preserved.

Historical aggregates may migrate only via exact transform. Materialized result never rerolls.

## Professional grade compatibility

`ProfessionalGradeAward` remains historical milestone. New readiness may differ, but automatic grade demotion forbidden.

Project/career content changes do not delete evidence because evidence stores source/context snapshot.

Title, salary, tenure, referral, employer reputation or promotion cannot be migrated into technical grade/evidence.

## Career compatibility

### Active search

Persisted surfaced opportunities retain:

- definition/version refs;
- visible and uncertain snapshots;
- candidate-signal snapshot where required;
- generation fingerprint/manifest;
- expiry/status.

Content/rules update cannot silently regenerate a different opportunity set.

### Active hiring

Persisted process retains:

- opportunity/stage/template refs;
- candidate decision history;
- portfolio/signal snapshot;
- materialized complication;
- employer projection/reasons;
- provisional outcome/offer;
- RNG/manifest/fingerprint.

Resume forbidden if exact meaning cannot continue. Recovery uses exact version, controlled migration or abandon to committed state.

### Active offer

Offer terms and uncertainty snapshots do not change silently after update. A content change cannot improve/worsen accepted or pending terms without explicit in-world event after compatible resume.

### Active employment

Position/title/scope/context/compensation/schedule refs and workplace trust preserve semantics. Migration must not:

- convert title into grade;
- merge trust into one performance score;
- duplicate salary or employment start/end;
- leave salary active after termination;
- reinterpret layoff/company closure as performance dismissal.

### Historical career content

Removed fictional employer/opportunity/role definitions use snapshot/tombstone labels. Historical record remains readable when no active dependency exists.

## Missing content

### Historical only

- keep tombstone/fallback label;
- releases/evidence/career history remain readable;
- normal open allowed if no active dependencies.

### Active

Missing active project, technology, opportunity, employer, role, hiring stage or offer definition blocks writable open when exact outcome cannot continue.

Recovery:

- restore content pack;
- replacement mapping;
- controlled migration with fixture;
- abandon active draft/process/search when policy permits;
- read-only export;
- exact compatible version.

## Active MonthRun

Draft contains fingerprints, owner snapshots, materialized states, decision history and RNG.

Resume forbidden if:

- provider outcome semantics changed;
- materialized ID/RNG inputs changed;
- phase order changed;
- required active content absent;
- owner contract changed incompatibly;
- exact migration unavailable.

Allowed:

- exact-compatible resume;
- controlled draft migration with golden fixture;
- abandon to committed save;
- Safe Mode/read-only export.

## Pre-career save migration

When Career Slice enters implementation:

1. backup;
2. add implemented Career schema/rules/content versions;
3. create minimal empty `CareerState`;
4. preserve existing professional/project/life/finance state unchanged;
5. do not synthesize fake prior jobs/titles/offers from professional grade;
6. do not create Company/team/payroll tables;
7. verify empty CareerState deterministic start;
8. record migration.

Optional narrative backfill may be introduced only through explicit, deterministic policy and must not create technical evidence or false historical employment.

## Support window

Writable migration window defined by release policy. Removing a path is a breaking decision with release note.

Read-only export of project/professional/career history should outlive writable window where practical.

## Compatibility tests

Base corpus:

- old app/current save;
- current app/old save;
- pre-ADR-013/014/018 save;
- active package before/after uncertainty;
- pending provider decision;
- committed release/professional result/grade;
- changed projection only;
- changed schema/rules/RNG/content;
- missing historical/active content;
- future schema;
- damaged project/evidence history.

Career Slice corpus:

- pre-career save → empty CareerState;
- active search before/after opportunity materialization;
- active interview before/after complication;
- pending offer before/after expiry;
- accepted position before/after commit crash;
- employment termination before/after salary stop;
- changed career projection only;
- changed employer/opportunity/hiring/trust rules;
- missing historical fictional employer;
- missing active hiring/offer content;
- title/grade mismatch preserved;
- layoff vs performance-dismissal reason preserved;
- duplicate opportunity/process/offer/transition/salary prevented;
- career draft abandon/read-only/export/recovery.
