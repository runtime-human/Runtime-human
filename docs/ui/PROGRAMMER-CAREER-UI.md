# Programmer Career UI

Нормативные источники:

- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Career Engine](../game-design/PROGRAMMER-CAREER-ENGINE.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Professional Challenge UI](PROFESSIONAL-CHALLENGE-UI.md).

## Цель

Показать карьерный выбор как понятный выбор профессионального контекста, а не как таблицу вакансий, скрытый шанс найма или HR-dashboard.

Normal mode должен отвечать:

1. Какая возможность появилась?
2. Почему она доступна именно сейчас?
3. Что в ней важно для моего пути?
4. Какой meaningful выбор требуется?
5. Что произошло и почему?
6. Как изменился следующий профессиональный шаг?

## 1. Visible complexity budget

Обычный career screen:

- 1 текущий Career Intent;
- 1–3 meaningful opportunities;
- 4–6 сравнительных характеристик;
- максимум 2 причины fit/gap;
- 2–4 approaches на blocking stage;
- один primary outcome;
- один next step.

Запрещено в Normal:

- exact hire probability;
- hidden score;
- десятки вакансий;
- таблица всех requirements;
- полный evidence browser;
- employee performance matrix;
- raw salary formulas;
- полный CompanyState.

## 2. Career overview

Основные объекты:

```text
Текущий путь
Активная работа или поиск
Главная возможность/риск месяца
Следующий профессиональный шаг
```

Пример:

```text
Первая работа программистом

Вы ищете место с наставничеством.
Две команды готовы рассмотреть ваш проект.

Сильная сторона: вы самостоятельно исправляли ошибки.
Пробел: нет опыта в существующей рабочей системе.
```

## 3. Career Intent selector

Показывается только при старте/смене campaign.

Карточки:

- первая доступная работа;
- наставничество;
- специализация;
- доход;
- стабильность;
- гибкость;
- portfolio-first;
- network-first.

Каждая карточка содержит:

- человеческое описание;
- что станет чаще появляться;
- какой компромисс вероятен;
- что intent не гарантирует.

Не показывать numeric modifiers.

## 4. Opportunity card

Карточка содержит:

- fictional employer;
- advertised role/title;
- source opportunity;
- 3–5 ключевых условий;
- один fit signal;
- один gap/uncertainty;
- expiry/urgency только когда она создаёт выбор.

Пример:

```text
Отдел автоматизации «Северный контур»
Помощник программиста

Стабильность: высокая
Наставничество: формальное
Задачи: небольшие изменения существующих программ
Технология: знакома частично

Почему вы заметны:
Ваш личный проект показывает самостоятельную отладку.

Неясно:
Сколько времени наставник сможет уделять вам после первого месяца.
```

Actions:

- рассмотреть;
- сравнить;
- начать/продолжить отбор;
- отложить;
- отказаться.

## 5. Opportunity comparison

Сравниваются максимум 2–3 alternatives.

Строки выбираются по current intent:

- income;
- stability;
- mentorship;
- task scope;
- technology relevance;
- workload;
- flexibility;
- growth.

Используются bands и короткие explanations. Не использовать green/red как единственный способ кодирования.

Пример:

| Условие | Небольшая команда | Крупная организация |
|---|---|---|
| Доход | ниже | средний |
| Наставничество | сильное, неформальное | формальное |
| Задачи | широкие | ограниченные |
| Стабильность | средняя | высокая |
| Риск | перегрузка | медленный рост |

UI не объявляет победителя.

## 6. Hiring stage

Используется общий layout meaningful situation:

```text
конкретная ситуация
почему она важна для этой роли
2–4 подхода
видимые trade-offs
```

Пример portfolio discussion:

```text
Команда просит рассказать о программе, где вы исправили проблему с вводом.

Что подчеркнуть?

[Как вы самостоятельно нашли причину]
Сильный сигнал самостоятельности, но проект небольшой.

[Как вы использовали feedback]
Показывает обучаемость, но слабее подтверждает автономность.

[Как вы упростили задачу]
Показывает контроль scope, но не полное решение.
```

Technical interview использует shared Professional Challenge cards и не показывает отдельную interview mini-game.

## 7. Hiring result

Результат состоит из пяти блоков:

1. outcome;
2. primary reason;
3. supporting reason/uncertainty;
4. offer или feedback;
5. next step.

Пример:

```text
Предложена стажировка

Команда увидела хорошее техническое рассуждение,
но пока не готова поручить вам задачу полностью самостоятельно.

Что помогло:
Вы сначала воспроизвели проблему и уточнили требования.

Что ограничило предложение:
У вас мало подтверждённого опыта в существующей кодовой базе.

Следующий шаг:
Пройти стажировку с review каждой значимой задачи
или укрепить portfolio ещё одним проектом.
```

Employer cancellation явно отделяется от candidate failure.

## 8. Offer screen

Показывает:

- роль и expected scope;
- income;
- schedule/location;
- 3–5 значимых conditions;
- uncertain conditions;
- probation/expiry;
- effect on current commitments.

Primary actions:

- принять;
- отклонить;
- сравнить;
- запросить clarification/negotiation, если доступно.

Не использовать countdown pressure без gameplay причины.

## 9. Employment overview

Normal employment screen:

```text
Роль и работодатель
Что вам сейчас доверяют
Главный рабочий контекст
Текущая нагрузка
Недавний причинный feedback
Следующий возможный шаг
```

Пример:

```text
Помощник программиста
«Северный контур»

Вам доверяют:
небольшие исправления с обязательным review.

Последний результат:
вы нашли ошибку, но поздно сообщили о риске срока.

Что изменилось:
качество вызывает доверие;
предсказуемость сроков пока требует внимания.
```

Нет общей полосы Performance 74/100.

## 10. Workplace trust presentation

В Normal показываются максимум 2 relevant dimensions:

- «можете работать с меньшим контролем»;
- «вам начали доверять небольшие функции целиком»;
- «качество стабильно»;
- «сроки пока трудно прогнозировать»;
- «вы усиливаете других через review».

Details может показать bounded dimensions:

- delivery;
- autonomy;
- quality;
- collaboration;
- growth trajectory.

Exact points скрыты.

## 11. Promotion / transition screen

Показывает организационное решение и отдельно professional truth.

Пример:

```text
Ответственность расширена

Компания пока не открыла новую должность,
но теперь вы владеете небольшой функцией от требования до выпуска.

Это не новый Professional Grade.
Новый scope даст возможность подтвердить недостающую самостоятельность.
```

При formal promotion:

```text
Новая должность: Программист
Professional Grade: Junior — без изменения
```

Различие title/grade не должно звучать как наказание.

## 12. Job loss and recovery

Причина показывается первой.

Layoff:

```text
Компания сократила отдел

Это решение не связано с качеством вашей работы.
Ваш Professional Grade и подтверждённый опыт сохранены.
```

Performance dismissal:

```text
Работа завершена из-за повторяющихся срывов самостоятельных задач.

Сильная сторона сохранена:
вы хорошо диагностируете ошибки.

Для похожей роли сейчас не хватает:
предсказуемого завершения задачи без постоянного сопровождения.
```

Recovery actions ограничены 2–4 содержательными вариантами.

## 13. Monthly report integration

Карьерный блок отчёта содержит максимум:

- one opportunity/hiring/employment outcome;
- one reason;
- one cost or benefit;
- one professional/life consequence;
- one next step.

Routine summary:

```text
Вы продолжали работать и получили зарплату.
Обычные исправления и review агрегированы.
```

Не создавать modal для каждой заявки, зарплаты или routine task.

## 14. Details and Advanced

### Details

- source of opportunity;
- summarized requirements;
- visible signal strengths/gaps;
- employer feedback history;
- offer detail;
- workplace trust dimensions;
- career transition history.

### Advanced

Только для диагностики/модов/баланса:

- reason codes;
- content IDs/fingerprints;
- deterministic manifest refs;
- projection inputs;
- idempotency/dedup status.

Advanced не меняет outcome.

## 15. Accessibility

- keyboard-only navigation;
- visible focus;
- semantic headings and lists;
- screen-reader comparison summaries;
- bands не кодируются только цветом;
- long Russian employer/title/condition text wraps;
- no timed interaction requirement;
- motion optional;
- uncertainty and disabled reasons read aloud;
- tables have linear mobile/compact fallback.

## 16. Storybook stories

Обязательные stories:

- no job / first search;
- three opportunity cards;
- salary vs mentorship comparison;
- weak signal / strong capability;
- referral access;
- hard requirement blocked with alternative route;
- portfolio discussion;
- situational interview;
- standard offer;
- conditional offer;
- alternate role;
- rejection with feedback;
- employer cancellation;
- active employment;
- scope trust increased;
- mixed workplace feedback;
- promotion delayed;
- title/grade mismatch;
- layoff;
- performance dismissal recovery;
- break/re-entry;
- long RU;
- keyboard/screen-reader states;
- suspended/reloaded decision unchanged.

## 17. UI failure gates

UI отклоняется, если:

- игрок воспринимает экран как job board/CRM;
- сравнение требует Details;
- exact probability становится главным ориентиром;
- salary визуально доминирует над всеми trade-offs;
- title выглядит как grade;
- rejection не объясняет candidate vs employer cause;
- performance превращается в один score;
- routine work создаёт ежемесячный modal;
- более трёх opportunities регулярно требуют решения;
- long RU ломает layout;
- цвет является единственным носителем смысла.
