# ADR-009: Narrative Director

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

Одних event requirements, weights и cooldown недостаточно: игра может повторять одинаковые события, создавать кризисные серии и бросать сюжетные цепочки.

## Предлагаемое решение

Создать отдельный чистый `NarrativeDirector`, который получает допустимые candidates от Event Engine и применяет pacing modifiers:

- blocking budget;
- anti-repeat/anti-streak;
- category/participant diversity;
- intensity/recovery windows;
- active arc priority;
- quiet months;
- milestones.

Director не меняет effects и не создаёт недопустимые события.

## Последствия

Плюсы: управляемый ритм, разнообразие и сюжетная непрерывность.

Минусы: новый набор balance rules, metrics и golden snapshots.

## Альтернативы

- увеличивать число cooldown полей в каждом событии — плохо масштабируется;
- полностью scripted campaign — уменьшает реиграбельность;
- чистая случайность — ухудшает narrative quality.