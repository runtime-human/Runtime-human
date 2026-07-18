# Programmer Learning UI

## Статус

Нормативная UI-спецификация для [Programmer Learning Engine](../game-design/PROGRAMMER-LEARNING-ENGINE.md).

Основание:

- [ADR-017](../adr/ADR-017-authoritative-programmer-learning-access-model.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Professional Challenge UI](PROFESSIONAL-CHALLENGE-UI.md).

## 1. Цель

Игрок должен быстро понимать:

- чему персонаж хочет научиться;
- какие пути доступны сейчас;
- чем отличаются способы учиться;
- какая помощь будет использована;
- что персонаж понял или смог сделать;
- какой следующий шаг полезен.

Normal mode не является LMS, расписанием занятий, каталогом курсов или таблицей педагогических коэффициентов.

## 2. Основная формула

```text
learning goal
→ source/access summary
→ 2–4 approaches
→ month result
→ capability/next step
```

Routine learning отображается компактно и не создаёт modal decision каждый месяц.

## 3. Normal mode information budget

На обычном learning screen/card одновременно показываются:

1. один learning goal;
2. один основной source/opportunity;
3. один access warning или advantage;
4. 2–4 approaches, если decision блокирующий;
5. один current capability status;
6. один next step.

Не показываются одновременно:

- mastery/fluency/familiarity percentages;
- source affordance matrix;
- retrieval/spacing schedule;
- exact success probabilities;
- feedback coefficients;
- evidence claims;
- длинный список prerequisites;
- десятки альтернативных курсов.

## 4. Learning opportunity card

```text
Проверка ввода

Цель: понять, как программа реагирует на неправильные данные.

Источник: руководство с рабочим примером
Доступ: школьный компьютер по выходным

Что сделать в этом месяце?
```

Card fields:

- title;
- plain-language goal;
- source label;
- one-line source strength;
- access summary;
- time/cost only when meaningful;
- current capability phrase;
- available approaches.

## 5. Source presentation

Source описывается через player value, а не рейтинг:

### Good copy

> Пошаговое руководство с рабочими примерами. Ответы на вопросы придётся искать самостоятельно.

> Кружок даёт быстрый feedback, но доступен только два вечера в месяц.

> Собственный проект даст больше самостоятельного опыта, но легко застрять без помощи.

### Forbidden copy

> Theory +20%, Feedback 0.6, Transfer multiplier 1.15.

> Источник S-tier.

> Этот курс даёт максимальный XP.

## 6. Access states

### Available

> Можно заниматься дома в любое свободное время.

### Limited

> Школьный компьютер доступен по выходным. Практика будет медленнее, но путь открыт.

### Blocked with route

> Для этого курса нужен компьютер с дисководом.
>
> Доступный путь: школьный кабинет или накопить на подержанный компьютер.

### Temporarily unavailable

> Кружок закрыт на каникулы. Можно продолжить по книге или вернуться в сентябре.

Нельзя показывать `Недоступно` без причины и next/recovery route, если это блокирует весь programmer path.

## 7. Learning approach cards

Approach card содержит:

- action label;
- plain-language forecast;
- 1–2 trade-offs;
- help/autonomy summary when relevant;
- availability explanation.

### Example

```text
Разобрать готовый пример
Быстрее понять общий принцип.
— меньше самостоятельной практики
— низкий риск застрять
```

```text
Изменить пример самому
Попробовать применить идею к другой проверке.
— больше самостоятельного опыта
— можно не закончить за месяц
```

```text
Попросить подсказку у наставника
Получить направление без готового решения.
— выше шанс разобраться
— наставник доступен только один раз
```

Approach card не использует green/red framing как correct/wrong answer. Primary button style применяется только к текущему selection, а не к «лучшему» варианту.

## 8. Assistance wording

UI различает:

- `Намёк` — указывает направление;
- `Объяснение` — раскрывает концепцию;
- `Совместный разбор` — решение строится вместе;
- `Работа в паре` — результат общий;
- `Готовое решение` — задача может быть закрыта, но самостоятельность не подтверждается.

Нельзя писать просто `Получить помощь +25%`.

## 9. Learning result

Result card отвечает максимум пятью блоками:

1. outcome headline;
2. observable result/artifact;
3. what helped;
4. independence/assistance interpretation;
5. next step.

### Example: worked example + modification

```text
Вы поняли, как проверять ввод

Вы изменили готовый пример и добавили проверку для пустого значения.

Помогло:
— рабочий пример показывал правильную структуру;
— вы объяснили себе назначение каждого шага.

Пока не доказано:
— самостоятельная отладка в незнакомой программе.

Следующий шаг:
Применить проверку ввода в собственном проекте.
```

### Example: assisted result

```text
Вы завершили упражнение с подсказкой

Наставник указал, где искать ошибку, а исправление вы внесли сами.

Вы лучше понимаете причину проблемы, но такой результат пока не подтверждает полностью самостоятельную отладку.
```

### Example: blocked with recovery

```text
Практику пришлось отложить

В школьном кабинете не оказалось нужной версии среды.

Что осталось полезным:
Вы разобрали пример на бумаге и подготовили план проверки.

Следующий путь:
Использовать совместимый пример или вернуться после обновления кабинета.
```

## 10. Capability display

Player-facing ladder:

```text
слышал об этом
→ изучает
→ понимает основы
→ применяет с помощью
→ применяет самостоятельно
→ переносит в новый контекст
```

Показывается только текущий status и ближайший next step.

### Example

> **Проверка ввода — понимает основы**  
> Вы можете объяснить, зачем нужна проверка, и изменить знакомый пример. Следующий шаг — применить её без готового решения.

Exact internal points доступны только diagnostics/advanced tooling, не ordinary player UI.

## 11. Routine practice summary

Обычный месяц:

```text
Практика продолжалась
— повторили знакомые конструкции
— увереннее используете BASIC
— серьёзных новых результатов не было
```

Routine changes группируются в одну строку/карточку. Не создаётся карточка evidence на каждое упражнение.

## 12. Source comparison

Normal mode сравнивает не более трёх реально доступных вариантов и использует qualitative dimensions:

| Источник | Лучше подходит для | Ограничение |
|---|---|---|
| Руководство | понять пример и начать | нет быстрого feedback |
| Кружок | получить explanation/review | редкое расписание |
| Личный проект | самостоятельная практика | выше риск застрять |

Не показываются магазинные рейтинги, prestige score или hidden multipliers.

## 13. Historical UI

Era differences видны через контекст:

### 1990

- носитель: книга/журнал/дискета;
- доступ: дом/школа/кружок;
- feedback: учитель, знакомый, письмо/BBS where available;
- ограничения: техника, язык, стоимость, совместимость.

### 2000s+

- появляются web/forum/community routes;
- позже videos, Git hosting, interactive courses;
- UI не заменяет старые sources автоматически: они остаются viable в подходящем контексте.

### AI era

UI явно называет mode:

- попросить объяснение;
- получить hint;
- сгенерировать пример;
- получить готовое решение;
- проверить решение.

`AI-assisted` не маскируется под `independent`.

## 14. Integration with Professional Challenge UI

Learning UI передаёт управление Challenge UI, когда возникает concrete technical situation.

```text
Learning Opportunity
→ practice begins
→ Technical Situation appears
→ Professional Challenge decision
→ Learning + provider result
```

Игрок не видит два независимых modal окна с дублирующими решениями. Learning card объясняет goal/source; Challenge card — конкретную проблему и approaches.

## 15. First-month UI

January 1990 не получает отдельный большой Education screen.

Minimum:

- compact learning card on Today screen;
- one source/access line;
- short choice: разобрать пример / изменить пример / попросить объяснение;
- result embedded before or inside project setup;
- one next step leading to invalid-input challenge.

Project challenge remains the only required blocking professional decision.

## 16. Details mode

Может показывать:

- why source was available;
- help/feedback history;
- important practice artifacts;
- recent learning contexts;
- reason codes translated to prose;
- why independent capability is not yet confirmed;
- access route history.

Не показывает exact formula unless diagnostics build.

## 17. Storybook coverage

### Opportunity

- available source;
- limited access;
- blocked with recovery route;
- obsolete/misleading source warning;
- mentor available/unavailable;
- long RU localization.

### Approaches

- worked example;
- self-explanation;
- modify example;
- independent practice;
- hint;
- pair work;
- unavailable approach with reason.

### Results

- understood concept;
- reproduced with guidance;
- independent application;
- transfer success;
- assisted result;
- partial learning;
- blocked with recovery;
- fragile understanding;
- routine aggregate.

### Integration

- learning → challenge transition;
- suspended attempt;
- duplicate answer;
- provider revision conflict;
- low-income/no-home-computer path.

### Accessibility

- keyboard-only;
- 200% zoom;
- high contrast;
- reduced motion;
- screen reader headings/status;
- no color-only autonomy/availability signal;
- long source/access explanations.

## 18. Usability tests

Player should be able to:

- restate learning goal;
- explain how two sources differ;
- identify whether help affects independence;
- choose within 10–20 seconds for blocking decision;
- distinguish `понял` from `может сделать самостоятельно`;
- find access recovery route;
- explain result causes;
- find next practical step.

Failure signals:

- player searches for highest XP;
- UI perceived as school planner/course marketplace;
- player assumes expensive source always better;
- assisted outcome read as independent;
- access warning feels like permanent lock;
- player cannot tell whether project practice is required.

## 19. Copy rules

Prefer:

- `разобрать пример`;
- `изменить самостоятельно`;
- `получить подсказку`;
- `применить в своём проекте`;
- `пока не доказано`;
- `следующий шаг`.

Avoid in Normal mode:

- `affordance`;
- `retrieval practice coefficient`;
- `scaffolding`;
- `mastery delta`;
- `evidence claim`;
- `autonomy BPS`;
- `knowledge XP`.

## 20. Definition of Done

MVP UI готов, когда:

- ordinary screen stays within 3–5 primary objects;
- learning goal/source/access are understood;
- decision has 2–3 readable approaches;
- result distinguishes understanding, guidance and independence;
- no exact hidden values are needed;
- low-access route is discoverable;
- learning → challenge transition is coherent;
- routine practice is compact;
- accessibility fixtures pass;
- majority of playtesters wants the next project/learning step.