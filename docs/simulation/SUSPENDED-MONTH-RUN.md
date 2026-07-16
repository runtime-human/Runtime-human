# Приостановленный MonthRun

## Проблема

Важное событие может остановить месяц до решения игрока. Основной сейв нельзя оставлять наполовину изменённым, а повторный расчёт без сохранённого контекста может нарушить детерминированность.

## State machine

```text
ready
→ running
→ suspended-for-decision
→ running
→ completed
→ committed
```

Ошибочные состояния:

```text
failed
incompatible-after-update
recovery-required
```

## Draft model

`pending_month_runs` хранит:

- run ID;
- save ID и base revision;
- month index/current date;
- rules/save schema versions;
- content fingerprint;
- RNG algorithm и state;
- MonthPlan;
- intermediate immutable state;
- pending decision;
- decision history;
- checksum.

## Правила

- Draft не изменяет основной сейв.
- На один save допускается один активный MonthRun.
- Resume проверяет base revision и compatibility.
- Обновление приложения, миграция и смена модов блокируются при активном draft.
- Закрытие приложения безопасно после записи draft.
- Abandon удаляет draft и оставляет базовый сейв без изменений.

## Commit

Завершённый MonthRun записывается одной транзакцией:

1. compare revision;
2. write snapshot;
3. append histories/ledger;
4. increment revision;
5. delete draft;
6. commit.

## Recovery

При несовместимости после обновления доступны:

- запуск старой совместимой версии;
- отмена draft;
- read-only diagnostic export.

Нельзя автоматически продолжать draft на другой rules/content version без явной миграции.