---
title: "BACKUP-AND-RESTORE"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Backup и restore

## Цели

- восстановление после повреждения или неудачной migration;
- защита перед обновлением;
- ручной export/import;
- перенос между компьютерами без cloud service.

## Создание backup

1. Заблокировать conflicting operations.
2. Завершить/отложить активный MonthRun согласно policy.
3. Создать согласованный snapshot через SQLite Backup API или эквивалент.
4. Закрыть destination connection.
5. Выполнить `quick_check` и checksum.
6. Записать metadata manifest.
7. Атомарно переименовать temporary file.
8. Применить retention policy.

Прямое копирование активной SQLite базы и WAL запрещено.

## Retention

Рекомендуемый baseline:

- последние 5 automatic backups;
- один backup перед migration/update;
- пользовательские manual backups не удаляются автоматически без явной policy.

## Restore

Restore выполняется вне активной игровой сессии:

- проверить manifest/checksum;
- проверить schema compatibility;
- сохранить backup текущего состояния;
- восстановить во временный путь;
- выполнить integrity и semantic checks;
- атомарно заменить рабочую базу;
- перезапустить read models.

## Export format

Export package содержит database snapshot, manifest, version matrix и optional safe screenshots/metadata. Secrets, абсолютные пути и logs не включаются по умолчанию.

## Тесты

- restore каждого fixture;
- interrupted backup;
- недостаток места;
- corrupted checksum;
- incompatible future schema;
- backup при WAL activity;
- восстановление с pending MonthRun.