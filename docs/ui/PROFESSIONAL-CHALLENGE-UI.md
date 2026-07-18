---
title: "PROFESSIONAL-CHALLENGE-UI"
type: ui
status: draft
canon: true
updated: 2026-07-18
---

# Professional Challenge UI

## Статус

Нормативная UI-спецификация для [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md) и [ADR-016](../adr/ADR-016-authoritative-professional-challenge-model.md).

## 1. Цель

UI должен позволить игроку без профессионального опыта за 10–20 секунд понять:

- что произошло;
- почему ситуация важна;
- какие подходы доступны;
- чем они принципиально различаются;
- какой результат получился и почему;
- чему персонаж научился;
- что делать дальше.

Normal mode не является урезанным diagnostics view. Это основной продуктовый интерфейс.

## 2. Interaction flow

```text
Situation preview
→ 2–4 approach cards
→ confirm / Next month
→ optional suspended state
→ outcome report
→ capability/next challenge
```

В обычном месяце challenge может отсутствовать. Routine professional work автоматически агрегируется в monthly report.

## 3. Situation card

Обязательные элементы:

1. короткий title;
2. concrete goal;
3. plain-language problem;
4. максимум две причины сложности;
5. stakes в человеческой формулировке;
6. 2–4 approach options.

Example:

```text
Неправильный ввод

Основная программа работает, но при вводе текста вместо числа показывает непонятный результат.

Почему сложно:
— вы ещё не исправляли такие ошибки самостоятельно;
— выпуск планировался в этом месяце.
```

Не показывать в Normal:

- exact success chance;
- internal challenge dimensions;
- mastery/evidence points;
- RNG seed/trace;
- provider revision;
- full project matrix.

## 4. Approach cards

Каждая card содержит:

- глагольный label;
- 1–2 строки о способе действия;
- максимум два trade-off markers;
- availability explanation, если option недоступна;
- selected state.

Example:

```text
Разобраться самостоятельно

Сначала воспроизвести ошибку и проверить входные данные.

+ больше самостоятельного опыта
− выпуск может задержаться
```

### Правила wording

- не использовать `+15% Debugging`;
- не маркировать option как recommended/correct без tutorial reason;
- не раскрывать exact outcome;
- не использовать jargon без inline explanation;
- варианты должны описывать подход, а не эмоцию или косметический стиль;
- text должен помещаться при long RU localization и 200% scaling.

## 5. Forecast language

Допустимые формулировки:

- вероятно поможет найти причину;
- повышает шанс закончить сейчас;
- уменьшает объём первой версии;
- снижает риск повторной ошибки;
- потребует больше времени;
- даёт меньше самостоятельного опыта;
- сохраняет силы, но переносит результат.

Недопустимые формулировки:

- успех 73,4%;
- readiness +12;
- optimal choice;
- гарантированно лучший результат;
- скрытые technical terms без объяснения.

## 6. Blocking decision state

При открытом challenge:

- явно показано, что MonthRun приостановлен;
- другие необратимые actions заблокированы;
- сохранение/закрытие приложения безопасно;
- после reload восстанавливаются те же situation, options, wording versions и realized complication;
- повторное подтверждение не создаёт новый outcome.

UI не должен создавать ощущение ошибки приложения или незавершённой формы.

## 7. Result report

Normal result содержит максимум пять смысловых блоков:

1. **Результат** — clean/compromise/partial/failure human wording;
2. **Почему** — 1–3 главных causal factors;
3. **Цена/последствие** — delay, debt, scope, quality, assistance;
4. **Развитие** — capability/skill explanation от Progression;
5. **Следующий шаг** — один concrete option.

Example:

```text
Проблема найдена

Вы самостоятельно воспроизвели ошибку и поняли, что программа не проверяет ввод.

Помогло:
— вы проверили данные до изменения кода;
— задача была ограниченной и знакомой.

Цена:
— выпуск перенесён на февраль.

Отладка улучшилась
Вы можете самостоятельно находить простые ошибки во вводе.

Следующий шаг:
Закончить обработку ошибок без подсказки.
```

## 8. Outcome variants

### Clean success

- ясно показывает completed result;
- не скрывает потраченное время/capacity;
- capability не обещает больше, чем подтверждено.

### Success with compromise

- compromise находится рядом с success;
- technical debt/known issue объясняется plain language;
- recovery доступен позже.

### Partial progress

- показывает, что именно выяснено/сделано;
- не выглядит как нулевой результат;
- следующий шаг продолжает тот же context.

### Failed with learning

- не выдаёт false delivery;
- показывает полученное понимание;
- содержит recovery path;
- не унижает игрока и не использует случайный punishment tone.

### Assisted result

- помощь показана как позитивный learning factor;
- autonomy ограничена честно;
- mentor/NPC relation consequence может быть отдельной строкой.

## 9. Progressive disclosure

### Normal

- situation;
- causes;
- approaches/trade-offs;
- result;
- capability;
- next step.

### Details

По запросу:

- дополнительные contributing factors;
- relevant skills/technology statuses;
- previous similar experience;
- why an option was available/unavailable;
- important project effect.

### Advanced/Diagnostics

Не входит в MVP:

- IDs/versions;
- raw reason codes;
- trace hash;
- internal bands/points;
- deterministic manifest;
- content validation data.

Details/Advanced не меняют outcome.

## 10. Main-screen integration

Challenge появляется как primary focus только когда требует решения.

Today screen при blocking situation показывает:

- одну challenge card;
- текущий project/work context;
- critical life constraint только если влияет на choice;
- `Продолжить месяц` после выбора.

Не показывать одновременно:

- полную progression dashboard;
- весь project backlog;
- несколько несвязанных professional choices;
- отдельные evidence cards;
- raw finance/life panels, не влияющие на decision.

## 11. Accessibility

Обязательно:

- keyboard-only selection/confirmation;
- visible focus;
- screen-reader group labels;
- trade-offs не кодируются только цветом;
- 200% zoom без горизонтального чтения option text;
- long RU strings;
- reduced motion;
- no timer;
- confirmation не требует drag/precision;
- result headings имеют логический порядок.

## 12. Storybook fixtures

MVP stories:

### Situation

- default invalid-input situation;
- one unavailable option with explanation;
- long RU text;
- 200% scaling;
- keyboard focus sequence;
- high contrast/reduced motion.

### Outcomes

- independent clean success;
- assisted success;
- simplified release with limitation;
- partial progress;
- failed with learning;
- February recovery;
- result with capability milestone;
- result without milestone.

### Persistence/recovery

- suspended before answer;
- selected but not committed;
- reload restored;
- duplicate answer ignored;
- provider revision conflict/recovery message.

### Edge states

- missing localization fallback;
- missing optional Details data;
- invalid/quarantined content template;
- save in safe mode;
- no available challenge this month.

## 13. Usability tests

Player should:

- correctly restate goal/problem;
- identify difference between at least two approaches;
- choose within 10–20 seconds;
- predict trade-off direction;
- understand assisted vs independent;
- explain at least two causes after result;
- find next step;
- not require Details;
- not describe screen as quiz, Jira, performance review or spreadsheet.

## 14. Content UX guardrails

Reject UI/content when:

- option text differs only by reward number;
- one card is visually promoted without design reason;
- technical jargon determines success comprehension;
- exact probabilities encourage save-scumming/meta;
- result omits compromise;
- failure has no recovery;
- capability claim exceeds outcome;
- more than four ordinary options are shown;
- more than two visible challenge causes are required;
- monthly report repeats full challenge text instead of summarizing it.

## 15. Definition of Done

MVP UI готов, когда:

- situation/approaches/result have deterministic fixtures;
- player understands the choice in Normal mode;
- all outcome variants are causally explained;
- long RU/keyboard/200%/contrast/reduced motion pass;
- suspended/reload state is unambiguous;
- no raw evidence/score bureaucracy is required;
- majority playtesters wants to continue to the next challenge.
