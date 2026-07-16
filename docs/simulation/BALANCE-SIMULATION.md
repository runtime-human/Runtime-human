# Баланс и массовые симуляции

## Назначение

Ручное прохождение не обнаруживает редкие soft locks, экономические разрывы и невозможные карьерные пути. Поэтому core должен запускаться headless через CLI.

## Balance simulator

```bash
pnpm balance:simulate --runs 10000 --scenario canonical-1990
```

CLI использует production Game Core и versioned content registry, но автоматического policy player вместо UI.

## Метрики

- возраст первого компьютера;
- время до Intern/Junior/Middle/Senior;
- доля персонажей без работы;
- доходы, расходы, debt и bankruptcy;
- burnout frequency;
- project completion rate;
- open-source success distribution;
- company survival;
- Top Programmer rarity;
- event frequency и repetition;
- недостижимые technologies/content;
- soft lock indicators.

## Сценарии

- canonical 1990 average start;
- low-income family;
- high-learning character;
- weak health/high workload;
- corporate path;
- open-source path;
- founder path;
- no-luck seed corpus;
- long-run post-2026 future.

## Gates

Smoke suite выполняет сотни прогонов в обычном CI. Большая выборка запускается nightly/release.

Пороговые значения versioned и хранятся рядом с report schema. Изменение баланса требует сравнения baseline и объяснения значимых сдвигов.

## Отчёты

Simulator сохраняет machine-readable JSON и human-readable Markdown. Raw personal data отсутствует, так как используются синтетические персонажи.

## Проверки

- ни одного NaN/overflow;
- отсутствие зависших MonthRun;
- отсутствие отрицательной длительности;
- достижимость обязательного vertical-slice content;
- ограниченная частота blocking events;
- воспроизводимость run по seed.