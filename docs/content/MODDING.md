---
title: "MODDING"
type: content
status: draft
canon: true
updated: 2026-07-18
---

# Моды

## Scope

Моды являются data packs. Они могут добавлять события, вымышленные компании, оборудование, жильё, локализацию и альтернативный future content. Они не исполняют JavaScript, Rust, native binaries, WASM или shell commands.

## Namespace

```text
core.*
author.mod-name.*
```

Мод не может по умолчанию заменить `core.*`. Patch требует явного manifest и conflict policy.

## Manifest

Обязательные поля:

- manifest schema version;
- mod ID/version;
- author;
- content API compatibility range;
- dependencies;
- conflicts;
- load order constraints;
- declared patches;
- asset inventory;
- license;
- file checksums;
- canonical package fingerprint;
- optional publisher signature;
- tombstones/remaps/migration declarations.

Подпись не является обязательной для локально созданного мода, но checksum/fingerprint обязательны всегда.

## Lock file

Сейв хранит `mod-lock` с exact versions, checksums/fingerprints и deterministic load order. Открытие без required mod запускает compatibility flow, а не молча удаляет references.

## Package limits

До распаковки проверяются:

- compressed size;
- declared uncompressed size;
- file count;
- maximum file size;
- archive nesting depth;
- allowed extensions;
- normalized paths.

Запрещаются absolute paths, `..`, symlinks/reparse escapes, device paths и archive recursion вне установленного лимита.

## Loading

1. вычислить checksum исходного package;
2. прочитать manifest без полной распаковки;
3. проверить limits и compatibility;
4. безопасно распаковать во временную quarantine-папку;
5. проверить path traversal/zip-slip/archive depth;
6. сверить file checksums;
7. schema validation;
8. semantic/reference/chronology validation;
9. conflict/dependency resolution;
10. compile isolated registry;
11. вычислить canonical content fingerprint;
12. активировать только после успешной проверки одной controlled operation.

Invalid pack остаётся в quarantine либо удаляется после явного решения пользователя. Он никогда не становится частью active content registry частично.

## Conflict policy

- duplicate ID без explicit patch — error;
- dependency cycle — error;
- incompatible version — error;
- checksum mismatch — error;
- explicit patches применяются deterministic load order;
- результат входит в content fingerprint;
- core ID removal требует tombstone/remap;
- silent last-write-wins запрещён.

## Migrations

Мод не выполняет произвольный migration code.

Разрешены только declarative operations, поддерживаемые content API:

- ID alias/remap;
- tombstone;
- field default/update по versioned schema;
- bounded transform из allowlist.

Сложное несовместимое изменение требует новой major content API либо read-only recovery.

## Safe Mode

Safe Mode отключает все user mods и позволяет открыть recovery UI. Core content никогда не зависит от пользовательского мода.

Missing mod flow предлагает:

- восстановить exact package;
- открыть read-only/export;
- использовать declared replacement/remap;
- отказаться от открытия, если authoritative references нельзя сохранить.

## Security

- mods считаются untrusted input;
- rich text sanitization обязательна;
- SVG из модов по умолчанию запрещён;
- network URLs не загружаются автоматически;
- production Tauri capabilities не расширяются модом;
- мод не получает доступ к SQLite/filesystem/API;
- package parser покрывается fuzz/proptest после появления реализации.

## Не входит в baseline

- code mods;
- Steam Workshop;
- сетевой marketplace;
- автоматическая загрузка внешних URL;
- multiplayer synchronization;
- automatic unsigned remote updates модов.

## Future

Моддинг реализуется после стабильных schemas, save migrations и Content Studio. Раннее публичное обещание совместимости не допускается до фиксации content API 1.0.

Manifest schema и import validator создаются раньше пользовательского mod UI, чтобы встроенные content packs использовали тот же дисциплинированный lifecycle.