---
title: "Performance budgets"
type: ui
status: draft
canon: true
updated: 2026-07-18
---

# Performance budgets

## Reference machine

- Windows 11 x64;
- 4 CPU cores;
- 8 GB RAM;
- integrated graphics;
- SSD;
- 1920×1080.

## Цели

| Метрика | Цель p95 |
|---|---:|
| Cold start | ≤ 1.5 s |
| Открытие существующего сейва | ≤ 500 ms |
| Обычный MonthRun | ≤ 100 ms |
| Тяжёлый MonthRun | ≤ 500 ms |
| UI long task | ≤ 50 ms |
| Frame during animation | ≤ 16.7 ms |
| Idle RAM | ≤ 250 MB |
| Save после 1000 месяцев | ≤ 50 MB |
| Backup | ≤ 2 s |
| Content validation | ≤ 5 s |
| Fast local verification | ≤ 30 s |
| CI без installer | ≤ 10 min |

## Измерение

- core benchmarks без UI;
- Playwright/browser traces;
- WebdriverIO cold-start runs;
- Rust timing spans;
- save-size fixtures;
- memory snapshots;
- bundle reports отдельной CI-задачей.

## Budget enforcement

Регрессия больше согласованного допуска блокирует PR либо требует documented exception. Среднее без p95 недостаточно.

## Оптимизация

Приоритет:

1. измерить;
2. устранить лишнюю работу/IO;
3. уменьшить объём state/read model;
4. virtualize длинные списки;
5. вынести массовую симуляцию в worker/tool;
6. только затем применять ручную memoization.

## Build performance

Vite 8/Rolldown, Oxlint/Oxfmt, TS project references, pnpm cache и sccache используются для сокращения feedback loop. Полный installer не строится на каждый commit.