# Historical Timeline Source Policy

## Назначение

Документ определяет, как наполняется историческая временная шкала Runtime Human. Исторические даты нельзя брать из памяти агента без проверки.

## Приоритет источников

1. Официальный release archive, документация или репозиторий проекта.
2. Официальная история компании, фонда или стандартизирующей организации.
3. Архив первичного объявления, release notes или mailing list.
4. Качественный вторичный источник для контекста распространения.
5. Энциклопедические источники только как навигация к первичным материалам.

## Обязательные поля записи

```ts
type HistoricalSourceRecord = Readonly<{
  id: SourceRefId;
  title: string;
  url: string;
  publisher: string;
  sourceType:
    | 'release-archive'
    | 'official-history'
    | 'announcement'
    | 'standard'
    | 'secondary';
  accessedAt: string;
  supports: readonly string[];
  archivedUrl?: string;
}>;
```

Machine-readable registry: [`SOURCE-REGISTRY.jsonc`](SOURCE-REGISTRY.jsonc).

## Confidence и precision

- `primary` — дата подтверждена первичным источником.
- `secondary` — подтверждена несколькими качественными вторичными источниками.
- `estimated` — точная дата недоступна; используется интервал и пояснение.

Дата отдельно хранит precision: `day`, `month`, `quarter`, `year`. Estimated/year-level запись нельзя использовать для жёсткой разблокировки в случайно выбранный день.

## Стартовые исторические опорные точки

| Год | Событие | Предпочтительный источник |
|---:|---|---|
| 1990 | старт канонической кампании | ADR-001 |
| 1991 | публичное распространение World Wide Web | CERN / W3C |
| 1991 | ранний публичный Python 0.9.x | Python archives / historical announcement |
| 1991 | объявление и ранние версии Linux | kernel.org / announcement archive |
| 1993 | Mosaic и ускорение массового Web | NCSA / CERN historical materials |
| 1994 | Python 1.0 | Python release archives |
| 1995 | Windows 95 | Microsoft history/lifecycle |
| 1995 | Java | Sun/Oracle historical archives |
| 1995 | JavaScript | Netscape/Ecma history |
| 1995 | PHP Tools 1.0 | PHP manual history |
| 1995 | Ruby 0.95 | Ruby release archives |

Таблица является backlog источников, а не автоматически подтверждённым dataset. Каждая запись в `content/history/**` всё равно обязана иметь sourceRefs.

## Базовые ссылки

- CERN — Birth of the Web: https://home.cern/science/computing/birth-web
- W3C — History: https://www.w3.org/History.html
- Python documentation and archives: https://www.python.org/doc/versions/
- Python source history: https://github.com/python/cpython
- Linux Kernel Archives: https://www.kernel.org/
- PHP manual — History: https://www.php.net/manual/en/history.php.php
- Ruby official site: https://www.ruby-lang.org/en/about/
- Ruby releases: https://www.ruby-lang.org/en/downloads/releases/
- Ecma TC39 / ECMA-262: https://tc39.es/ecma262/
- Microsoft lifecycle: https://learn.microsoft.com/en-us/lifecycle/products/

## Модель доступности

Глобальная дата появления технологии не равна доступности персонажу в вымышленном мегаполисе. Для каждой записи отдельно моделируются:

- announcement;
- first public release;
- global consumer availability;
- local city availability;
- hardware/platform requirements;
- цена входа;
- распространение литературы, журналов и курсов;
- professional demand в локальном рынке;
- mainstream adoption;
- decline;
- end of support.

Multi-country/region table не используется. Локальная задержка и спрос определяются `HomeCityProfile`, `EraProfile` и `LocalMarketState`.

## Реальные компании

Базовый игровой мир использует вымышленных работодателей и конкурентов. Реальные компании допускаются в исторической базе только как фактический контекст появления продукта или отраслевого события.

Не использовать без отдельной проверки:

- официальные логотипы;
- рекламные материалы;
- trade dress;
- вымышленные скандалы и внутренние события;
- фиктивное партнёрство или endorsement.

## Будущая граница

`historicalThrough = 2026-07`. После неё реальные компании и бренды не получают придуманные будущие релизы. Альтернативное будущее использует вымышленные IDs и маркируется как fictional future.

## Review process

Любое изменение `content/history/**` обязано:

1. содержать `sourceRefs`;
2. проходить schema validation;
3. проходить chronology/prerequisite validation;
4. не создавать продукт раньше prerequisites;
5. иметь human review при изменении canonical date;
6. обновлять snapshot исторического каталога;
7. обновлять semantic content fingerprint;
8. не вводить multi-region simulation в обход ADR-003.
