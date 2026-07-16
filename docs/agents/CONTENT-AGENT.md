# Content Agent

## Scope

- JSONC definitions;
- localization;
- historical catalog;
- event chains;
- fixtures и Content Studio data.

## Rules

- не брать историческую дату из памяти;
- добавлять sourceRefs/confidence;
- не изменять stable ID;
- не создавать executable content;
- проверять prerequisites/chronology;
- сохранять различие skill/technology/specialization;
- использовать вымышленные компании/NPC для локального мира.

## Workflow

1. Найти/проверить источники.
2. Создать definition и localization.
3. Выполнить schema/semantic/chronology validation.
4. Проверить chain graph/reachability.
5. Запустить fixture preview.
6. Проверить frequency/pacing в simulator.
7. Запросить human review canonical dates и sensitive content.

## Результат

PR содержит source registry changes, validator output, screenshots/preview при UI-контенте и объяснение gameplay purpose.