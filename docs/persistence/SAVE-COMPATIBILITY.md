# Совместимость сохранений

Нормативные решения: [ADR-010](../adr/ADR-010-authoritative-save-state.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Compatibility dimensions

Сейв совместим по независимым измерениям:

- save schema version;
- professional state schema version;
- evidence schema version;
- rules/progression version;
- readiness projection version;
- content API version;
- exact/compatible content fingerprint;
- active MonthRun progression fingerprint.

Projection version может быть несовместима только с cache и не обязана блокировать открытие: cache удаляется и перестраивается.

## Open policy

Результат проверки:

- `compatible` — открыть нормально;
- `compatible-rebuild-projections` — открыть и перестроить readiness/specialization/indexes;
- `requires-migration` — создать backup и мигрировать authoritative state/history;
- `missing-content` — использовать semantic evidence snapshots/tombstones, предложить восстановить pack при критических active refs;
- `future-version` — read-only metadata/export;
- `incompatible-draft` — отдельно обработать pending MonthRun;
- `professional-history-damaged` — Safe Mode/read-only export/restore.

## Content fingerprint

Fingerprint строится из canonical manifest активных packs, их versions и compiled definitions. Cosmetic localization change не обязана ломать MonthRun, если semantic fingerprint не изменился.

Professional semantic fingerprint включает provider/task/skill/technology/grade profile definitions, влияющие на active run. Изменение только display label не меняет outcome fingerprint.

## Rules changes

Изменение формул, RNG, effect/progression phase order, skill semantics, evidence claims или grade gates получает новую rules/progression version.

- уже завершённые месяцы не пересчитываются;
- awarded grades не отменяются молча;
- readiness projections могут быть перестроены;
- active draft требует exact-compatible rules либо migration/recovery;
- transfer changes применяются к будущему learning, если migration не указывает обратное.

## Professional grade compatibility

`ProfessionalGradeAward` хранит:

- grade;
- award date;
- rules version;
- evidence set hash;
- profile ID.

Новая версия может показать другой current market readiness, но не понижает исторически awarded grade автоматически.

Если старый grade был получен моделью, которую новая версия считает ошибочной, требуется отдельная migration/compatibility policy и пользовательский audit trail; silent correction запрещён.

## Missing content

- stable IDs не переиспользуются;
- removed entity получает tombstone;
- replacement mapping может восстановить active reference;
- evidence semantic snapshot остаётся читаемым без исходной definition;
- historical evidence не блокирует normal open только из-за missing mod;
- критически отсутствующий active project/company/task/technology definition блокирует normal writable open;
- read-only export остаётся доступным.

## Active draft

Pending MonthRun хранит provider/progression fingerprints, episodes, draft deltas и evidence IDs.

Нельзя продолжать draft, если:

- provider outcome semantics изменились;
- skill/evidence schema не имеет exact migration;
- deterministic evidence ID inputs изменились;
- progression phase/order изменён;
- content required для active task отсутствует.

Разрешены:

- exact-compatible resume;
- controlled draft migration с golden fixture;
- abandon с возвратом к committed save;
- read-only diagnostics/export.

## Support window

Поддерживаемое число старых версий фиксируется в release policy. Удаление migration path является отдельным breaking decision и отражается в release notes.

Read-only export professional history должен сохраняться дольше writable migration window, насколько это практически возможно.

## Tests

Compatibility matrix выполняется автоматически на corpus fixtures:

- old app/current save;
- current app/old save;
- pre-ADR-013 save;
- changed readiness projection only;
- changed skill/evidence schema;
- awarded grade old rules;
- missing technology/mod with historical evidence;
- missing content with active task;
- pending draft before/after evidence materialization;
- changed transfer graph;
- future schema;
- damaged evidence ledger/recovery.
