# Совместимость сохранений

## Compatibility dimensions

Сейв совместим по четырём независимым измерениям:

- save schema version;
- rules version;
- content API version;
- exact/compatible content fingerprint.

## Open policy

Результат проверки:

- `compatible` — открыть нормально;
- `requires-migration` — создать backup и мигрировать;
- `missing-content` — предложить восстановить pack, использовать tombstones или открыть read-only;
- `future-version` — read-only metadata/export;
- `incompatible-draft` — отдельно обработать pending MonthRun.

## Content fingerprint

Fingerprint строится из canonical manifest активных packs, их versions и compiled definitions. Cosmetic localization change не обязана ломать MonthRun, если semantic fingerprint не изменился.

## Rules changes

Изменение формул, RNG или effect order получает новую rules version. Уже завершённые месяцы не пересчитываются. Активный draft требует exact-compatible rules либо migration.

## Missing content

- stable IDs не переиспользуются;
- removed entity получает tombstone;
- replacement mapping может восстановить reference;
- критически отсутствующий project/company definition блокирует normal open;
- read-only export остаётся доступным.

## Support window

Поддерживаемое число старых версий фиксируется в release policy. Удаление migration path является отдельным breaking decision и отражается в release notes.

## Tests

Compatibility matrix выполняется автоматически на corpus fixtures: old app/current save, current app/old save, missing mod, changed content, pending draft и future schema.