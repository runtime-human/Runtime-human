---
title: "Agent eval suite"
type: engine
status: draft
canon: true
updated: 2026-08-24
---

# Agent eval suite

Статус: **planned / P2**. Набор representative tasks для проверки, что изменение модели/skill/prompt/tooling не ухудшило агентный workflow. Запускается после значимых harness/model изменений; результаты — runtime material в `.studio/runtime/evals/` (не коммитится), агрегаты — в отчёты/метрики.

## Representative tasks (стартовый набор)

1. добавить простую content entity с provenance;
2. изменить один balance modifier (после balance layer);
3. добавить scenario branch (после scenario v1);
4. исправить pure Game Core bug;
5. изменить UI component + Story;
6. исправить accessibility issue;
7. воспроизвести `.repro.json` и исправить bug (после repro/replay);
8. schema evolution authoring-only;
9. persistence read-only inspection task;
10. docs/ADR navigation task.

## Что измерять

```text
accepted / failed
attempts
tokens (input/output)
wall time
changed files / unrelated diff
commands
review findings
scope violations
```

Ключевые KPI поверх измерений: context bytes на принятую задачу, agent calls на задачу, review rounds, one-cycle completion rate, finding recurrence rate.

## Golden task policy

Eval-задачи не зависят от секретов, внешних mutable API или случайных web-результатов; работают локально/fixture-first offline. Ожидаемый результат фиксируется до запуска. Изменение eval-задачи — отдельное решение Producer'а, синхронизированное с изменением контрактов.
