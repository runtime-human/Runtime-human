# Совместимость сохранений

Нормативные решения:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Compatibility dimensions

Independent dimensions:

- save/database schema;
- project/work-package/release schema;
- professional/evidence schema;
- game/project/progression rules;
- project/professional projection versions;
- content API;
- exact/compatible content/mod fingerprint;
- active MonthRun project/progression fingerprint;
- Determinism Manifest/RNG algorithms.

Projection mismatch may rebuild cache without blocking open.

## Open policy

- `compatible` — normal writable open;
- `compatible-rebuild-projections` — rebuild project/readiness indexes;
- `requires-migration` — backup + authoritative migration;
- `missing-content-historical-only` — use snapshots/tombstones;
- `missing-content-active` — block writable open until recovery;
- `future-version` — read-only metadata/export;
- `incompatible-draft` — active MonthRun recovery flow;
- `project-history-damaged` — Safe Mode/read-only/restore;
- `professional-history-damaged` — Safe Mode/read-only/restore.

## Semantic fingerprints

Project semantic fingerprint includes definitions affecting active outcome:

- project archetype/kind;
- Work Package template/kind/state rules;
- challenge/latent work/forecast rules;
- quality profile/gates;
- debt/defect/materialization rules;
- release/maintenance policies;
- era project capabilities;
- provider/extension contracts.

Professional fingerprint includes episode/skill/technology/evidence/grade rules.

Cosmetic localization does not break semantic fingerprint.

## Rules changes

New version required for changes to:

- WorkPackage lifecycle/outcome;
- progress/latent work/RNG;
- quality dimension semantics/gates;
- debt principal/drag/risk;
- defect severity/materialization;
- release technical outcome;
- contribution attribution;
- MonthRun project/progression order;
- skill/evidence/grade semantics.

Completed months/releases do not recalculate.

Project/professional projections may rebuild.

## Project history compatibility

Committed `ReleaseRecord`, incident, major scope decision and significant contribution summary keep:

- semantic snapshot;
- rules/content versions;
- trace/source hashes;
- stable IDs.

New code cannot silently change past technical outcome, quality snapshot, accepted debt/known issues or contribution.

Corruption correction requires explicit repair record and backup.

## Latent work and defects

Active package stores deterministic latent work realization and RNG/checksum.

Writable resume forbidden when:

- latent realization algorithm/state cannot be preserved;
- package uncertainty/defect semantics changed without exact migration;
- completed random result would reroll;
- project pre-state hashes mismatch.

Historical latent aggregates may migrate only via exact transform. Known defects/incidents never reroll.

## Scope/quality/debt compatibility

- stable scope/requirement/quality/debt IDs not reused;
- removed active refs need replacement/migration/recovery;
- historical refs use tombstone/snapshot;
- quality cache may rebuild, authoritative target/assessment/confidence cannot be dropped;
- debt record origin/principal/drag/risk preserved;
- package split/merge cannot duplicate release/episode/evidence.

## Professional grade compatibility

`ProfessionalGradeAward` remains historical milestone. New readiness may differ, but automatic grade demotion forbidden.

Project content change does not delete evidence because evidence stores source/context snapshot.

## Missing content

### Historical only

- keep tombstone/fallback label;
- releases/debt/defects/evidence remain readable;
- normal open allowed if no active dependencies.

### Active

Missing archetype/package/quality/technology/project extension definition blocks writable open when exact outcome cannot continue.

Recovery options:

- restore content pack;
- replacement mapping;
- controlled migration;
- abandon active draft/package if policy permits;
- read-only export;
- exact compatible version.

## Active MonthRun

Draft contains project/progression fingerprints, package/release/incident/episode/evidence drafts and RNG states.

Resume forbidden if:

- package/provider outcome semantics changed;
- latent/defect/release ID/RNG inputs changed;
- project/progression phase order changed;
- required active content absent;
- exact migration unavailable.

Allowed:

- exact-compatible resume;
- controlled draft migration with golden fixture;
- abandon to committed save;
- Safe Mode/read-only export.

## Support window

Writable migration window defined by release policy. Removing path is breaking decision/release note.

Read-only export of project/professional history should outlive writable window where practical.

## Compatibility tests

Corpus matrix:

- old app/current save;
- current app/old save;
- pre-ADR-013/014 save;
- legacy one-progress project;
- active package before/after latent revelation;
- pending scope/quality/release decision;
- committed release/incident;
- changed project projection only;
- changed package/quality/debt/defect schema;
- changed project RNG;
- missing project/mod historical content;
- missing content active package;
- package split/merge migration;
- quality dimension transform;
- project outcome + evidence refs;
- pending draft before/after episode/evidence;
- awarded grade old rules;
- future schema;
- damaged project/evidence ledger recovery.
