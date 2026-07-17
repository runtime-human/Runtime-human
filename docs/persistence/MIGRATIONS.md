# Миграции

Нормативные решения: [ADR-010](../adr/ADR-010-authoritative-save-state.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Версии

Отдельно versioned:

- database schema;
- save envelope;
- professional state schema;
- evidence schema;
- readiness projection version;
- game/progression rules;
- content API;
- content pack revisions.

Одна версия приложения может поддерживать несколько старых save schema через последовательные migrations.

## Правила migration

- migration immutable после публичного релиза;
- каждая migration имеет forward test;
- destructive step требует предварительного backup;
- migration выполняется в transaction, если SQLite позволяет;
- after-check включает foreign keys и semantic invariants;
- rollback приложения не обязан уметь читать новый schema; это явно показывается пользователю;
- awarded grade не пересчитывается молча новой readiness formula;
- evidence history не переписывается без migration record/source hashes;
- semantic evidence snapshot сохраняется при удалении/переименовании content;
- active MonthRun с progression draft требует exact-compatible migration либо abort/recovery.

## Professional progression migrations

### Snapshot migration

Разрешено:

- добавить новый optional skill state с default;
- изменить storage layout mastery/fluency без изменения semantic scale через exact transform;
- создать technology family/remap;
- перенести professional fields из старого `CharacterState` в `CharacterProfessionalState`;
- перестроить derived readiness/specialization caches.

Требует отдельного breaking review:

- изменение numeric scale;
- объединение/разделение skills;
- изменение capability bands;
- изменение evidence claim semantics;
- автоматическое изменение awarded grade;
- потеря source/context snapshot.

### Evidence migration

Evidence append-only, но schema может мигрировать:

- добавить derived/fallback field;
- переименовать discriminator через exact mapping;
- создать tombstone/localization fallback;
- агрегировать repetitive historical events только отдельной compaction migration.

Compaction обязана сохранять:

- covered period;
- claim summary;
- source event hashes/count;
- migration ID/version;
- previous aggregate hash;
- возможность audit/recovery проверки.

### Projection migration

Readiness, specialization, indexes и capability cards rebuildable. Их cache можно удалить и перестроить без изменения authoritative save revision, если authoritative state/history не меняются.

Новая projection formula не изменяет `ProfessionalGradeAward`; она может изменить current readiness/explanation.

## Content migrations

Stable content IDs не переиспользуются. Renames используют alias/replacement mapping. Активные event chains, projects, technologies и tasks проходят отдельную migration.

Для professional evidence:

- removed content получает tombstone;
- evidence сохраняет semantic snapshot;
- Tier A/B → Tier C transition не удаляет historical familiarity/evidence без explicit transform;
- transfer-edge changes применяются только к будущему learning, если migration не говорит иначе;
- active draft не продолжает новую provider/progression definition молча.

## Corpus

В репозитории хранятся anonymized/synthetic fixtures всех поддерживаемых save versions. CI мигрирует каждый fixture до current schema и сравнивает ожидаемые invariants.

Corpus включает:

- pre-ADR-013 save без professional state;
- first evidence schema;
- awarded Beginner/Intern/Junior/Middle/Senior milestones;
- missing technology/mod definition;
- active draft до/после evidence materialization;
- merged/split skill migration;
- projection cache rebuild;
- historical evidence compaction fixture после появления функции.

## Failure

При ошибке:

1. основной файл не заменяется;
2. сохраняется pre-migration backup;
3. приложение входит в Safe Mode;
4. пользователь может экспортировать диагностику и professional history;
5. автоматический повтор не выполняется бесконечно;
6. awarded grades/evidence не частично переписываются.

## Human review

Любые изменения `migrations/**`, save compatibility matrix, skill/evidence semantics, awarded-grade transforms и destructive operations требуют human review и отдельного раздела в PR.
