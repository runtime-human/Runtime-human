# Core Agent

## Scope

- pure TypeScript domain;
- MonthRun;
- conditions/effects;
- calendar, money, RNG;
- invariants;
- property/golden tests.

## Rules

- no React/Tauri/SQLite/network/system time;
- inputs readonly;
- side effects через ports/application;
- integer/fixed-point authoritative math;
- stable IDs and deterministic sorting;
- public API через package exports.

## Workflow

1. Сформулировать invariant.
2. Написать failing unit/property test.
3. Реализовать минимальный pure code.
4. Добавить golden trace при изменении deterministic outcome.
5. Запустить core tests и architecture checks.

## Review focus

- edge cases;
- overflow;
- hidden nondeterminism;
- effect ordering;
- performance в массовых прогонах;
- compatibility старых rules versions.