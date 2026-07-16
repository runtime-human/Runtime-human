# Моды

## Scope

Моды являются data packs. Они могут добавлять события, вымышленные компании, оборудование, жильё, локализацию и альтернативный future content. Они не исполняют JavaScript, Rust, native binaries или shell commands.

## Namespace

```text
core.*
author.mod-name.*
```

Мод не может по умолчанию заменить `core.*`. Patch требует явного manifest и conflict policy.

## Manifest

- mod ID/version;
- author;
- content API range;
- dependencies;
- conflicts;
- load order constraints;
- declared patches;
- asset inventory;
- license;
- semantic fingerprint.

## Lock file

Сейв хранит `mod-lock` с exact versions/fingerprints. Открытие без required mod запускает compatibility flow, а не молча удаляет references.

## Loading

1. безопасно распаковать во временную папку;
2. проверить limits/path traversal/archive depth;
3. schema validation;
4. semantic/reference validation;
5. conflict resolution;
6. compile isolated registry;
7. quarantine invalid pack;
8. активировать только после успешной проверки.

## Conflict policy

- duplicate ID без explicit patch — error;
- dependency cycle — error;
- incompatible version — error;
- explicit patches применяются deterministic load order;
- результат входит в content fingerprint.

## Safe Mode

Safe Mode отключает все user mods и позволяет открыть recovery UI. Core content никогда не зависит от пользовательского мода.

## Не входит в baseline

- code mods;
- Steam Workshop;
- сетевой marketplace;
- автоматическая загрузка внешних URL;
- multiplayer synchronization.

## Future

Моддинг реализуется после стабильных schemas, save migrations и Content Studio. Раннее публичное обещание совместимости не допускается до фиксации content API 1.0.