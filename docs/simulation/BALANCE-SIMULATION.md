# Баланс и массовые симуляции

Нормативная продуктовая иерархия: [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md).

## Назначение

Ручное прохождение не обнаруживает редкие soft locks, экономические разрывы, деградацию programmer fantasy, доминирующие стратегии и невозможные карьерные пути. Поэтому core должен запускаться headless через CLI.

Balance simulator проверяет не только выживаемость персонажа, но и то, остаётся ли игра симулятором развития программиста на всём жизненном цикле.

## Balance simulator

```bash
pnpm balance:simulate --runs 10000 --scenario canonical-1990
```

CLI использует production Game Core и versioned content registry, но автоматического policy player вместо UI.

Policy players должны представлять разные стили:

- balanced learner;
- deep specialist;
- broad generalist;
- cautious corporate;
- aggressive career switcher;
- open-source focused;
- founder;
- family-first;
- health-constrained;
- low-income recovery;
- random-but-valid;
- adversarial min-max.

## Основные метрики programmer-first

### Решения и ритм

- programmer-core decision share;
- direct technical decision share;
- meaningful decisions per month/year;
- months with professional outcome;
- maximum professional stagnation streak;
- quiet month rate;
- blocking events per year;
- life-only blocking share;
- repeated decision/category streaks;
- professional arc starvation.

### Прогрессия

- время до первого hands-on programming result;
- возраст первого доступного компьютера/среды;
- skill gain by source, difficulty и novelty;
- mastery/fluency/familiarity distribution;
- evidence diversity;
- evidence confidence;
- grade readiness dimensions;
- время до Intern/Junior/Middle/Senior;
- доля false-title/under-titled states;
- specialization switching recovery;
- return-after-break recovery;
- Top Programmer rarity.

### Технологии

- technology breadth/depth;
- Tier A/B/C exposure;
- adoption by lifecycle stage;
- newest-technology dominance;
- legacy value utilization;
- transfer efficiency;
- obsolete technology recovery;
- technologies/content never selected.

### Пути

- corporate specialist viability;
- technical leader/architect viability;
- public expert viability;
- freelancer viability;
- open-source maintainer viability;
- founder/CTO viability;
- calm career viability;
- path switching frequency и cost;
- path parity по mastery, autonomy, income, stability, reputation, fame, freedom, influence, workload, risk и legacy;
- Founder/CTO technical identity retention.

### Проекты и профессиональные результаты

- project completion rate;
- project failure/recovery;
- quality/debt/bug distributions;
- evidence produced per project kind;
- legacy burden;
- open-source adoption/community health;
- company survival;
- product revenue/sustainability.

### Жизнь и экономика

- доля персонажей без работы;
- доходы, расходы, savings, debt и bankruptcy;
- recovery after unemployment;
- burnout frequency/duration;
- health interruption recovery;
- family/relationship crisis recovery;
- money utility in late game;
- professional progress under different backgrounds.

## Target gates

Предварительные gates для canonical scenarios:

- минимум 60% meaningful decisions в rolling 12 months относятся к programmer/professional core;
- минимум 40% имеют direct technical component;
- минимум 8 из 12 месяцев имеют professional outcome или объяснимую паузу;
- обычная professional stagnation streak не превышает 3 месяцев;
- life-only blocking streak не превышает 2 без explicit crisis arc;
- Senior не достигается без varied evidence и нескольких project contexts;
- Founder не доминирует одновременно по income, freedom, influence и risk;
- latest-technology-only policy не должна стабильно превосходить все остальные;
- low-income и interrupted-career scenarios имеют recovery path;
- short break не стирает mastery/grade;
- Top Programmer остаётся редким endgame outcome;
- calm corporate path имеет самостоятельный достижимый endgame;
- ни один major path не создаёт обязательный soft lock в смежных системах.

Точные threshold values versioned и хранятся рядом с report schema. Они калибруются после первых playable traces.

## Сценарии

- canonical 1990 average start;
- low-income family;
- high-learning character;
- weak access to equipment;
- weak health/high workload;
- strong family commitments;
- corporate specialist path;
- architect/technical leader path;
- open-source path;
- public expert path;
- freelancer path;
- founder path;
- specialization switch;
- career break and return;
- no-luck seed corpus;
- adversarial min-max;
- long-run post-2026 future.

## Soft-lock indicators

- персонаж не может получить доступ ни к одной learnable technology;
- нет доступной работы, обучения, community resource или recovery action;
- debt растёт быстрее максимального достижимого дохода без restructuring path;
- health/fatigue не позволяет выполнить minimum recovery commitment;
- grade readiness остановлен из-за недостижимого evidence type;
- устаревшая specialization не имеет retraining/legacy path;
- relationship/family crisis бесконечно блокирует MonthRun;
- company/open-source failure уничтожает все карьерные варианты;
- Narrative Director starvation не выдаёт professional milestones;
- интерфейсный policy player не может понять причину стагнации из read model.

## Property tests

- ни одного NaN/overflow;
- отсутствие зависших MonthRun;
- отсутствие отрицательной длительности/work units/money;
- одинаковые seed/manifest/policy дают одинаковый trace;
- grade не повышается только от XP/time;
- evidence source и context обязательны для grade-relevant gain;
- short break не уменьшает mastery ниже установленного floor;
- reacquisition быстрее initial acquisition;
- ineligible technology/job/event никогда не выбирается;
- decision shares считаются независимо от UI order;
- professional deficit correction не нарушает Event Engine eligibility;
- failure state имеет хотя бы один reachable recovery action, если это не true ending.

## Golden tests

Golden corpus должен включать:

- первый январь 1990 с hands-on programming result;
- Beginner → Intern;
- Intern → Junior;
- Junior → Middle;
- Middle → Senior;
- смену specialization;
- увольнение и re-entry;
- burnout и recovery;
- legacy technology success;
- failed product and career recovery;
- open-source maintainer path;
- Founder с делегированием;
- спокойную корпоративную карьеру;
- позднюю карьеру и retirement/legacy.

## Gates и частота

Smoke suite выполняет сотни прогонов в обычном CI. Большая выборка запускается nightly/release.

Gameplay change, затрагивающий skills, grade, technology lifecycle, event distribution, economy или recovery, требует:

1. baseline report;
2. candidate report;
3. distribution comparison;
4. объяснения regressions;
5. обновления versioned thresholds при намеренном изменении.

## Отчёты

Simulator сохраняет machine-readable JSON и human-readable Markdown.

Human-readable report начинается с:

- programmer-first verdict;
- path parity verdict;
- soft-lock verdict;
- time-to-grade distributions;
- significant regressions.

Raw personal data отсутствует, так как используются синтетические персонажи.

## Минимальные проверки release gate

- programmer-first target shares соблюдаются в canonical scenarios;
- ни одного NaN/overflow;
- отсутствие зависших MonthRun;
- отсутствие отрицательной длительности;
- достижимость обязательного vertical-slice content;
- ограниченная частота blocking events;
- воспроизводимость run по seed;
- отсутствие необъяснимых grade promotions;
- отсутствие dominant path, превосходящего остальные по всем ключевым измерениям;
- recovery scenarios проходят;
- no-luck corpus не создаёт массовый soft lock.
