# Архитектура контента

Нормативные решения: [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md) и [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md).

## Цель

Большая часть событий, skills, technologies, activities, challenges, companies, equipment, housing и historical milestones должна добавляться без изменения Game Core.

Контент описывает definitions и provider parameters, но не исполняет произвольный progression code.

## Source format

- JSONC для структурированных definitions;
- отдельные localization files;
- asset manifests;
- source registry для historical claims.

YAML не является baseline из-за неоднозначностей типов и более слабой надёжности автоматических правок агентами.

## Pipeline

```text
source JSONC
→ parse with source locations
→ schema validation
→ semantic validation
→ chronology validation
→ reference graph validation
→ progression/balance lint
→ compile immutable registry
→ compile transfer edges/provider profiles
→ fingerprint and snapshots
```

## Content domains

### Professional progression

- skill groups/skills;
- technology families;
- technologies/version bands;
- directed transfer definitions;
- professional focus options;
- specialization profile definitions;
- grade profiles/capability bands;
- learning sources;
- professional activity definitions;
- challenge/task templates;
- feedback/assistance profiles;
- evidence reason/claim templates;
- provider outcome mappings.

### Other domains

- events;
- products/projects;
- companies;
- equipment;
- housing;
- conferences;
- education;
- eras/city;
- achievements;
- localization;
- historical sources.

## Definition ownership

Content definitions не владеют runtime state.

- `SkillDefinition` описывает ID, group, facets, visibility tier и localization.
- `TechnologyDefinition` описывает Tier A/B/C, family, lifecycle, requirements и compatibility.
- `TransferDefinition` компилируется в directed integer `TransferEdge`.
- `ProfessionalActivityDefinition` описывает commitment/provider contract.
- `ProfessionalChallengeTemplate` описывает challenge dimensions, outcome space и evidence potential.
- `GradeProfileDefinition` описывает gates/profiles, но awarded grade остаётся state/history.

Provider domain может расширять template своими fields, но отдаёт progression только нормализованный `ExperienceEpisode`.

## Stable IDs

Core content использует namespace `core.*`. ID не зависит от отображаемого названия и не переиспользуется после удаления.

Рекомендуемые namespaces:

```text
core.skill.*
core.tech-family.*
core.technology.*
core.transfer.*
core.activity.*
core.challenge.*
core.grade-profile.*
```

Evidence сохраняет semantic snapshot и не становится невалидным после удаления definition.

## ContentMetadata

Каждый объект имеет author, contentVersion, reviewStatus, createdAt, lastReviewedAt, tags и optional sourceRefs.

Professional definitions дополнительно могут иметь:

- rules compatibility range;
- historical availability;
- balance risk tags;
- UI visibility tier;
- migration/tombstone metadata.

## Semantic validation

Validator проверяет:

- skill graph без циклических hard prerequisites;
- отсутствие дублирующих skills/facets;
- Tier C technology не имеет proficiency state/grade requirement;
- technology lifecycle chronology;
- version band justification;
- transfer edge range/direction;
- transfer не создаёт evidence;
- challenge principal band согласован с dimensions;
- evidence template не подтверждает невозможную dimension;
- partial/failure outcome не даёт full delivery/quality claims;
- assistance profile не завышает autonomy;
- grade profile не является одним weighted average;
- provider outcome mapping имеет stable source/context;
- historical availability соответствует era/sourceRefs.

## Balance lint

- слишком много Tier A technologies;
- skill/content с отсутствующими providers;
- challenge без reachable outcome/recovery;
- easy-task farming risk;
- passive course создаёт production/impact evidence;
- один context полностью закрывает Senior gate;
- grade profile не имеет diversity/duration gate;
- transfer edge слишком высокий;
- challenge требует technology недоступной эпохи;
- activity не имеет work-unit/calendar cost;
- hidden mastery effect вне Progression Core.

## Immutable runtime

После компиляции definitions immutable. Игровое состояние ссылается на stable IDs и сохраняет definition version/fingerprint там, где изменение может повлиять на active process.

Runtime получает:

- compiled registries;
- prevalidated challenge/provider profiles;
- sparse directed transfer edges;
- grade profile registry;
- semantic fingerprints.

Runtime не вычисляет transfer из произвольных content dimensions во время MonthRun.

## Modding policy

Моды могут добавлять data-only skills/technologies/activities/challenges/profiles после schema/semantic validation.

Ограничения:

- нельзя исполнять formula script;
- нельзя переопределять core skill semantics без explicit patch/conflict policy;
- нельзя создавать evidence напрямую из raw text;
- нельзя расширять Tauri/persistence capabilities;
- incompatible professional definition блокирует pack activation;
- active save references используют mod-lock/tombstones/semantic snapshots.

## Content Studio

После vertical slice создаётся внутренний Content Studio для форм, challenge preview, progression outcome preview, chain graph, fixtures и localization review. Studio использует те же schemas и validators, что CI.

Storybook показывает professional cards/read models, но не исполняет privileged persistence.

## Запреты

- executable scripts;
- raw HTML;
- сетевые ссылки, загружаемые автоматически;
- ID по названию файла;
- канонические даты без provenance;
- скрытые side effects вне effect/provider/progression registry;
- direct skill/grade mutation из content;
- отдельная progression bar для Tier C;
- narrative choice, выдающий mastery без `ExperienceEpisode`.
