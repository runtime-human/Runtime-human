# Vertical Slice Plan

## Цель

Создать минимальную, но настоящую играбельную цепочку от нового персонажа до сохранённого результата первого месяца января 1990 года.

## Scope

Игрок:

1. создаёт персонажа 12 лет;
2. начинает в комнате родителей;
3. имеет стартовое семейное/финансовое состояние;
4. выбирает одно обучение и одну свободную покупку при наличии денег;
5. нажимает «Следующий месяц»;
6. получает автоматическую школу/домашние обязательства;
7. сталкивается минимум с одним возможным blocking event;
8. закрывает и возобновляет приостановленный MonthRun;
9. получает отчёт;
10. перезапускает приложение и загружает тот же сейв.

## Обязательные технические элементы

- pnpm monorepo;
- Tauri shell;
- React routing/design tokens;
- shared kernel/GameDate/Money/IDs;
- TypeBox/Ajv schemas;
- deterministic RNG;
- Gregorian calendar;
- Begin/Resume MonthRun;
- proposed persistence boundary prototype;
- SQLite schema/migration 001;
- backup smoke;
- JSONC content pack;
- Event Engine minimum;
- Narrative Director minimum blocking budget;
- Russian localization;
- Vitest/fast-check/Playwright;
- one WebdriverIO Tauri smoke.

## Content minimum

- один HomeCityProfile и era 1990–1994;
- 3 семейных стартовых background;
- 5 технологий ранней эпохи;
- 3 учебные активности;
- 6–10 событий;
- 3 варианта стартовой техники;
- 2 housing states;
- monthly report templates.

## Acceptance criteria

- одинаковый seed даёт одинаковый месяц;
- закрытие на blocking event безопасно;
- основной сейв не содержит half-applied month;
- money round trip точный;
- save загружается после restart;
- keyboard-only flow проходит;
- no raw SQL capability у renderer в выбранном prototype;
- `pnpm verify` проходит;
- architecture docs соответствуют реализации.

## Не входит

- полноценная работа/Junior career;
- компания;
- open source community;
- моды;
- updater release channel;
- несколько эпох;
- второй город/страна;
- backend.