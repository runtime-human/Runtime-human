# Жизненный цикл контента

## Статусы

```text
draft → reviewed → accepted → deprecated → removed/tombstoned
```

## Draft

Может содержать неполную локализацию и balance notes, но не входит в production registry.

## Reviewed

Прошёл schema/semantic checks и контентное ревью, но может ожидать source или balance approval.

## Accepted

Входит в канонический pack, имеет stable ID, version и полный набор обязательных metadata.

## Deprecated

Не создаётся в новых играх, но остаётся доступным для старых сейвов и active chains. Указывается replacement или причина отсутствия замены.

## Removed

Definition удаляется только после создания tombstone/migration и проверки save corpus.

## Изменения

### Non-semantic

Орфография, локализация и presentation metadata могут не менять semantic fingerprint.

### Semantic

Requirements, effects, historical dates, stats и relationships изменяют definition version и semantic fingerprint.

## Review gates

- исторические изменения — source review;
- баланс — simulation comparison;
- sensitivity — narrative review;
- schema/effect changes — core review;
- IDs/migrations — persistence review.

## Ownership

Каждый каталог имеет owner/reviewer roles. Агент может подготовить изменение, но канонические исторические даты и destructive ID changes требуют человека.

## Audit

Compiled registry хранит source revision, compiler version и content fingerprint. Release artifact содержит manifest канонического контента.