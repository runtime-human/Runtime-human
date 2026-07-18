---
title: "Technology & Ecosystem UI"
type: ui
status: draft
canon: true
depends_on: [ADR-019]
updated: 2026-07-18
---

# Technology & Ecosystem UI

Нормативные источники:

- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md)
- [UI Architecture](UI-ARCHITECTURE.md)

## Цель

Показывать технологию как понятный профессиональный контекст: что доступно, почему подходит или мешает текущей задаче и какой компромисс создаёт. UI не является tech tree, каталогом всех версий, IDE inventory или рейтингом языков.

## Normal mode answers

1. Чем персонаж сейчас работает?
2. Почему эта среда доступна?
3. Что она упрощает?
4. Какое ограничение важно сейчас?
5. Какой meaningful next step существует?

## Complexity budget

Обычная technology context card показывает:

- одну primary technology/context identity;
- 3–5 relevant traits;
- максимум одно primary warning;
- один next step или pending choice;
- broad labels, не числа.

Не показываются одновременно:

- полный lifecycle;
- transfer graph;
- все ecosystem dimensions;
- exact support dates;
- all compatible versions;
- package/dependency graph;
- market statistics;
- internal source confidence table.

## Context card

```text
BASIC-среда

Доступна на школьном компьютере
Примеры есть в руководстве
Небольшую программу легко проверить
Готовых компонентов мало
Помощь обычно приходится ждать

Подходит: первый текстовый проект
Ограничение: программа должна работать на школьных машинах
```

Primary fields:

- display identity/context;
- access label;
- 2–3 strengths;
- 1–2 constraints;
- project/learning/career relevance;
- next step.

## Human-readable bands

### Release/maturity

- экспериментальная;
- недавно доступна;
- проверенная;
- устоявшаяся.

### Ecosystem

- мало материалов и инструментов;
- экосистема развивается;
- много доступных инструментов;
- зрелая, но местами сложная;
- фрагментированная.

### Support

- активно развивается;
- получает ограниченные обновления;
- поддерживается только для критических исправлений;
- официальная поддержка завершена.

### Local access

- недоступна в городе;
- можно использовать только через редкий/shared route;
- доступна специалистам или организациям;
- доступна персонажу;
- широко распространена.

### Installed-base/legacy

- редко встречается;
- используется в отдельных системах;
- широко установлена;
- критична для старых систем.

Internal enum names не обязательны в player copy.

## Technology choice screen

Используется только при meaningful decision.

```text
Как продолжить проект?

[Оставить знакомую среду]
Быстрее продолжить. Совместимость сохранится.
Меньше новых возможностей и материалов.

[Попробовать новую среду]
Откроет более структурированный подход.
Потребуется время на освоение; доступ ограничен.

[Сначала улучшить проверку]
Снизит риск ошибок в текущей среде.
Отложит новую функцию.
```

Rules:

- 2–4 options;
- no green “best” option;
- known trade-off direction;
- unknowns shown honestly;
- disabled option explains concrete access/platform reason;
- no exact success probability.

## Technology comparison

Normal comparison is contextual, not universal.

```text
Для этого проекта

Знакомая среда
+ быстрее начать
+ работает на доступных машинах
− мало готовых компонентов

Новая среда
+ лучше поддерживает структуру проекта
+ больше возможностей для роста
− нужно осваивать
− доступна только в кружке
```

Forbidden:

- overall winner;
- “Technology A: 83 vs B: 77”;
- universal benchmark table;
- all ecosystem dimensions regardless of decision.

## Version-band UI

Version band shown only if:

- project compatibility depends on it;
- support status creates current risk;
- migration is available;
- learning/career opportunity requires it;
- save/history explanation needs identity.

Normal wording:

> Текущая версия привычна, но новые материалы всё чаще рассчитаны на следующую линию.

> Рабочая система использует старую совместимую среду. Обновление потребует отдельной миграции.

Exact release/support dates belong Details when decision-relevant.

## Ecosystem traits

UI chooses 3–5 traits from snapshot by salience:

- access;
- tooling;
- examples/docs;
- feedback/community;
- reusable components;
- testing/delivery support;
- compatibility;
- maintenance/support;
- verification burden;
- market/legacy relevance.

Salience is deterministic and rules-versioned. UI does not choose traits ad hoc.

## Access and fallback

Blocked state must explain route:

```text
Сейчас эта среда недоступна дома.

Можно:
— использовать компьютер в кружке;
— попросить знакомого показать основы;
— вернуться после покупки подходящего устройства.
```

UI never says only “Requirements not met”.

## Learning integration

Learning card may show:

```text
Что поможет освоить

Материалы: хорошие
Примеры: доступны
Обратная связь: только в кружке
Практика дома: недоступна
```

It does not calculate learning outcome or show exact mastery modifiers.

## Project integration

Project card shows only technology facts affecting current package:

```text
Технологический контекст

Знакомая среда ускоряет работу.
Слабая проверка ввода повышает риск повторной ошибки.
Проект должен запускаться на школьных компьютерах.
```

Project Engine owns result.

## Career integration

Opportunity/Employment UI may show:

```text
Технологический контекст роли

Вам знакомы основные принципы.
Рабочая версия новее вашей практики.
Компания готова обучать внутренним инструментам.
```

No exact role-fit percentage.

## Historical timeline

Timeline is secondary/Details content.

Shows meaningful milestones only:

- global public availability;
- local arrival;
- first meaningful project/career access;
- major version-band shift;
- support/legacy transition;
- character’s own first use.

It is not a complete release history.

## Monthly report

Technology row appears only when materially changed:

```text
Новая среда стала доступна в кружке.
Она предлагает более удобную структуру программ, но пока требует отдельного времени и доступа.
```

```text
Вы продолжили работу в знакомой версии.
Это помогло сохранить совместимость, но поддержка этой линии стала ограниченной.
```

Every row answers:

- what changed;
- why;
- current consequence;
- next possible action.

## Details

May show:

- lifecycle axes;
- source/support dates;
- version-band compatibility;
- broader ecosystem profile;
- local adaptation basis;
- project/history usage;
- transfer/reacquisition explanation.

Details cannot reveal hidden outcome or change decision.

## Advanced/Diagnostics

May show:

- stable IDs;
- content/rules fingerprints;
- source refs and confidence;
- compatibility edges;
- reason codes;
- snapshot hash;
- active recovery status.

Not part of normal gameplay.

## AI-era UI

AI tools are described by mode and burden:

```text
AI-помощник

Хорошо объясняет и предлагает варианты
Может быстро создать черновой код
Результат требует самостоятельной проверки
Доступен только на подходящем устройстве/сети
```

Do not show `AI +30% productivity` or treat all use as one action.

## Storybook fixtures

Required:

1. 1990 BASIC context;
2. global but locally unavailable;
3. school/shared access;
4. low-access fallback;
5. emerging ecosystem;
6. mainstream with complexity burden;
7. legacy-critical unsupported;
8. migration comparison;
9. version band warning;
10. project technology context;
11. career familiarity gap;
12. AI explanation/generation/verification;
13. long RU text;
14. keyboard-only and 200% scale;
15. missing-content recovery.

## Accessibility

- keyboard navigation;
- visible focus and focus restoration;
- headings/lists instead of color-only bands;
- status text announced by screen reader;
- no hover-only explanation;
- no drag-only tech tree;
- 200% scale/reflow;
- high contrast;
- long localization fixtures.

## Usability gates

Player can within 10–20 seconds:

- identify current technology context;
- name one advantage and one constraint;
- distinguish global existence from personal access;
- understand why newer is not automatically better;
- choose without opening Details.

After outcome player can explain at least two causal factors involving technology context.

## Forbidden drift

- tech-tree as required navigation;
- collectible language/version inventory;
- universal rating or winner badge;
- exact package/dependency view;
- every ecosystem axis on normal screen;
- popularity chart without scoped meaning;
- inaccessible option without fallback explanation;
- support warning with no consequence/action;
- UI calculating outcome or familiarity.

## Definition of Done

Technology UI is ready when Normal mode solves the current decision with 3–5 traits, all important states have Storybook fixtures, accessibility gates pass, Details are optional, terminology is human-readable and the same read model explains Learning, Project or Career use without duplicating owner logic.