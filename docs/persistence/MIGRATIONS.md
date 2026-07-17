# Миграции

Нормативные решения:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Version dimensions

Separately versioned:

- database schema;
- save envelope;
- project state/work-package/release schema;
- professional state/evidence schema;
- project/professional projection versions;
- game/project/progression rules;
- content API;
- content pack revisions.

Sequential migrations support old saves.

## General rules

- migration immutable after public release;
- every migration has forward tests;
- destructive step requires pre-migration backup;
- transaction where SQLite allows;
- after-check includes FKs and semantic invariants;
- rollback app may not read newer schema and must explain this;
- active MonthRun/package requires exact-compatible migration or abort/recovery;
- append-only history cannot be rewritten without migration/repair record and source hashes.

## Project snapshot migrations

Allowed with exact semantics:

- add optional project/quality/debt field with deterministic default;
- move old project fields into normalized tables;
- add project component/scope indexes;
- split routine aggregate from significant debt/defect records;
- introduce rebuildable forecast/dashboard caches;
- add new package kind when existing states map exactly;
- add extension refs for Product/Open Source/Company.

Breaking review required for:

- changing WorkPackage lifecycle/outcome semantics;
- changing quality dimension meaning/bands;
- changing latent work realization/RNG;
- merging/splitting active packages;
- changing debt principal/drag semantics;
- changing defect severity/materialization semantics;
- mutating committed ReleaseRecord;
- changing contribution attribution;
- converting product/company data into Project technical truth;
- losing semantic source/context snapshots.

## Work Package migration

Active package migration must preserve:

- stable package ID;
- lifecycle/revision;
- known progress;
- latent work realization/checksum;
- revealed/hidden amount;
- uncertainty state;
- pending decision/decision log;
- quality/debt/defect pre-state hashes;
- participant/contribution context;
- project/content/rules fingerprints;
- RNG scopes/states.

If exact preservation is impossible:

- active draft cannot continue;
- offer abandon to last committed save, exact compatible version, Safe Mode or read-only export;
- never reroll latent work/defects/releases.

## Scope migration

Stable scope/requirement IDs are not reused.

Allowed:

- alias/remap with semantic equivalence;
- add localization/fallback metadata;
- convert legacy single scope score into explicit slices only with deterministic mapping and migration record.

Removed scope uses tombstone/semantic snapshot. Releases/history retain old scope snapshot.

## Quality migration

Quality projection/cache can rebuild.

Authoritative dimension state migration must preserve:

- dimension identity;
- target;
- assessed band;
- confidence;
- source/revision.

Merging dimensions, such as reliability+security, requires explicit transform and golden corpus because release gates/history may change.

## Technical debt migration

Debt record migration preserves:

- origin;
- affected scope;
- principal work;
- change drag/risk;
- intentional marker;
- status/mitigation refs;
- previous hash.

Routine debt compaction may aggregate only records without distinct narrative/release/evidence significance.

## Defect/incident migration

- latent defect aggregates require exact scale/RNG compatibility;
- known defects keep severity/area/source/workaround/status;
- committed incidents/releases never reroll;
- removed defect content uses semantic snapshot/tombstone;
- active fix package refs remap explicitly.

## Release/history migration

`ReleaseRecord` immutable gameplay history.

Schema migration may add fallback/derived fields, but must preserve canonical semantic snapshot and previous hash.

Changing past technical outcome, quality snapshot, known issues, accepted debt or contribution requires corruption repair procedure, not normal balance migration.

## Resolved package compaction

Compaction allowed only for resolved routine packages.

Must retain:

- covered package IDs/period;
- semantic objective/kind;
- final outcome;
- scope/quality/debt/defect deltas;
- contribution summary;
- release/episode/evidence refs;
- source trace hashes/count;
- migration ID/version/previous aggregate hash.

Never compact active/recovery packages, releases, incidents, significant debt/scope decisions or records referenced by unresolved chains.

## Professional progression migrations

Awarded grade does not recalculate silently.

Evidence/source snapshots preserved when project content changes. Project package merge/split must not duplicate or orphan episodes/evidence.

Projection caches rebuild independently.

## Content migrations

Stable IDs never reused. Renames use alias/replacement.

Special handling:

- active project/package/release candidate;
- project archetype/quality profile;
- technology/project capability;
- event chains;
- evidence sources.

Rules changes apply prospectively unless migration explicitly transforms authoritative state.

## Corpus

Synthetic fixtures include:

- pre-ADR-013/014 save;
- legacy single-progress project;
- active package before/after latent revelation;
- pending release decision;
- project with debt/latent defects;
- committed release/incident;
- missing project/mod definition;
- package kind rename;
- quality dimension transform;
- debt/defect compaction;
- project outcome with episode/evidence;
- duplicate commit recovery;
- awarded grades/evidence history;
- projection cache rebuild.

CI migrates every supported fixture and validates expected canonical invariants/hashes.

## Failure

On migration error:

1. original file untouched;
2. pre-migration backup retained;
3. enter Safe Mode;
4. diagnostic/project/professional history export available;
5. no endless automatic retry;
6. no partial rewrite of project/releases/evidence/grades;
7. no reroll of hidden/project random state.

## Human review

Changes to migrations, compatibility matrix, WorkPackage/quality/debt/defect/release semantics, project RNG, evidence/grade semantics or destructive transforms require human review and explicit PR section.
