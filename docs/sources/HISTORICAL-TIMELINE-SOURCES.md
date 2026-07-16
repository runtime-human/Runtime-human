# Historical Timeline Source Policy

## Назначение

Этот документ определяет, как наполняется историческая временная шкала Runtime Human. Исторические даты нельзя брать из памяти агента без проверки.

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
  sourceType: 'release-archive' | 'official-history' | 'announcement' | 'standard' | 'secondary';
  accessedAt: string;
  supports: readonly string[];
  archivedUrl?: string;
}>;
```

## Confidence

- `primary` — точная дата подтверждена первичным источником.
- `secondary` — подтверждена несколькими качественными вторичными источниками.
- `estimated` — точная дата недоступна; используется интервал и пояснение.

`estimated` нельзя использовать для жёсткой разблокировки в конкретный день. Такие записи открываются по месяцу, кварталу или году.

## Стартовые исторические опорные точки

| Год | Событие | Источник/назначение |
|---:|---|---|
| 1990 | старт канонической кампании | архитектурное решение ADR-001 |
| 1991 | публичное распространение World Wide Web | CERN / W3C historical materials |
| 1991 | ранний публичный Python 0.9.x | Python release history и архивы `alt.sources` |
| 1991 | публичное объявление и ранние версии Linux | kernel.org и архив объявления Linus Torvalds |
| 1993 | Mosaic и ускорение массового Web | NCSA/CERN historical sources |
| 1994 | Python 1.0 | Python release archives |
| 1995 | Windows 95 | Microsoft lifecycle/history |
| 1995 | Java | Sun/Oracle historical archives |
| 1995 | JavaScript | Netscape announcement / Ecma history |
| 1995 | PHP Tools 1.0 | PHP manual history |
| 1995 | Ruby 0.95 | Ruby release archives |

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

Дата появления технологии не равна дате доступности персонажу. Для каждой записи отдельно моделируются:

- announcement;
- first public release;
- first consumer availability;
- региональная доступность;
- hardware requirements;
- цена входа;
- распространение литературы и курсов;
- professional demand;
- mainstream adoption;
- decline;
- end of support.

## Реальные компании

Базовый игровой мир использует вымышленных работодателей и конкурентов. Реальные компании допускаются в исторической базе только как фактический контекст появления продукта или отраслевого события. Не использовать официальные логотипы, рекламные материалы и копирование trade dress без отдельной проверки прав.

## Review process

Любое изменение `content/history/**` обязано:

1. содержать `sourceRefs`;
2. проходить schema validation;
3. проходить chronology validation;
4. не создавать продукт раньше его prerequisites;
5. иметь human review при изменении канонической даты;
6. обновлять snapshot исторического каталога.
