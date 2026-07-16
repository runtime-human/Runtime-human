# Архитектура контента

## Цель

Большая часть событий, технологий, компаний, оборудования, жилья и исторических вех должна добавляться без изменения Game Core.

## Source format

- JSONC для структурированных definitions;
- отдельные localization files;
- asset manifests;
- source registry для исторических claims.

YAML не является baseline из-за неоднозначностей типов и более слабой надёжности автоматических правок агентами.

## Pipeline

```text
source JSONC
→ parse with source locations
→ schema validation
→ semantic validation
→ chronology validation
→ reference graph validation
→ compile immutable registry
→ fingerprint and snapshots
```

## Content domains

- events;
- technologies;
- products;
- companies;
- equipment;
- housing;
- conferences;
- education;
- eras/city;
- achievements;
- localization;
- historical sources.

## Stable IDs

Core content использует namespace `core.*`. ID не зависит от отображаемого названия и не переиспользуется после удаления.

## ContentMetadata

Каждый объект имеет author, contentVersion, reviewStatus, createdAt, lastReviewedAt, tags и optional sourceRefs.

## Immutable runtime

После компиляции definitions immutable. Игровое состояние ссылается на stable IDs и сохраняет definition version там, где изменение может повлиять на активный процесс.

## Content Studio

После vertical slice создаётся внутренний Content Studio для форм, preview, chain graph, fixtures и localization review. Studio использует те же schemas и validators, что CI.

## Запреты

- executable scripts;
- raw HTML;
- сетевые ссылки, загружаемые автоматически;
- ID по названию файла;
- канонические даты без provenance;
- скрытые side effects вне effect registry.