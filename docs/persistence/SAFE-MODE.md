---
title: "SAFE-MODE"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Safe Mode

## Запуск

Safe Mode доступен через `--safe-mode` и предлагается автоматически после повторного crash marker, ошибки migration, content load failure или невозможности открыть последний сейв.

## Поведение

Safe Mode:

- отключает пользовательские моды;
- не открывает последний сейв автоматически;
- отключает updater;
- отключает пользовательскую тему и сложные анимации;
- открывает diagnostics/recovery экран;
- запрещает необратимые migrations без подтверждения;
- позволяет export, backup и restore;
- может открыть совместимый сейв read-only.

## Recovery actions

- проверить базу;
- восстановить последний backup;
- отменить pending MonthRun;
- quarantine повреждённый мод;
- сбросить UI settings;
- открыть папку diagnostics;
- экспортировать redacted support bundle.

## Crash marker

При старте создаётся session marker. После успешной инициализации и clean shutdown он очищается. Marker не должен ошибочно считать принудительное завершение installer/update повреждением сейва.

## Ограничения

Safe Mode не пытается автоматически «чинить» неизвестную corruption изменением данных. Любое исправление создаёт backup и подробный report.

## Тесты

- два последовательных failed starts;
- invalid mod;
- failed migration;
- corrupt settings;
- restore flow;
- read-only future save;
- выход обратно в normal mode.